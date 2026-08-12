-- Hardening das automações: autenticação do scheduler, comunicações
-- não redundantes e alinhamento dos preparadores ao modelo atual.

create or replace function public.invoke_beautyflow_automation(function_name text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  project_url text;
  publishable_key text;
  automation_secret text;
  request_id bigint;
begin
  if function_name not in ('reminders', 'daily-summary', 'promotion-mailer') then
    raise exception 'Executor de automação inválido';
  end if;

  select decrypted_secret into project_url from vault.decrypted_secrets where name='beautyflow_project_url' limit 1;
  select decrypted_secret into publishable_key from vault.decrypted_secrets where name='beautyflow_publishable_key' limit 1;
  select decrypted_secret into automation_secret from vault.decrypted_secrets where name='beautyflow_automation_cron_secret' limit 1;

  if nullif(project_url,'') is null or nullif(publishable_key,'') is null or nullif(automation_secret,'') is null then
    raise warning 'Automação % não executada: configure URL, chave publicável e segredo do scheduler no Vault.', function_name;
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url,'/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization','Bearer ' || publishable_key,
      'apikey',publishable_key,
      'Content-Type','application/json',
      'x-beautyflow-automation-secret',automation_secret
    ),
    body := jsonb_build_object('source','pg_cron')
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function public.invoke_beautyflow_automation(text) from public, anon, authenticated;
grant execute on function public.invoke_beautyflow_automation(text) to service_role;

-- Uma transição de pagamento que também confirma/cancela o agendamento deve
-- gerar somente o e-mail de pagamento, que já comunica o resultado completo.
create or replace function public.automation_appointment_email_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  vars jsonb;
  names text;
  payment_changed boolean := false;
begin
  select coalesce(string_agg(service_name,', '),new.service_name,'Atendimento')
    into names from public.appointment_services where appointment_id=new.id;
  vars:=jsonb_build_object(
    'customer_name',new.customer_name,
    'appointment_date',to_char(new.appointment_date,'DD/MM/YYYY'),
    'appointment_time',left(new.appointment_time,5),
    'service_name',names,
    'reservation_amount',to_char(coalesce(new.reservation_amount,0),'FM999999990D00'),
    'customer_email',new.email,
    'customer_phone',new.phone,
    'submitted_at',to_char(coalesce(new.created_at,now()),'DD/MM/YYYY HH24:MI'),
    'request_id',new.id
  );

  if tg_op='INSERT' and new.payment_status='em_analise' then
    perform public.enqueue_automation_email(new.email,'payment_review','payment_analysis','payment-review:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    perform public.enqueue_automation_email('admin@invalid.local','admin_payment_review','admin_payment_review','admin-payment-review:'||new.id,vars,jsonb_build_object('appointment_id',new.id,'requires_admin_email',true));
    insert into public.admin_notifications(appointment_id,type,title,message)
    values(new.id::text,'payment_review','Novo pagamento para análise',new.customer_name);
  end if;

  if tg_op='UPDATE' and new.payment_status is distinct from old.payment_status then
    if new.payment_status in('aprovado','pago','approved','confirmado') then
      payment_changed:=true;
      perform public.enqueue_automation_email(new.email,'payment_confirmed','payment_proof','payment-approved:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    elsif new.payment_status in('recusado','refused','rejeitado') then
      payment_changed:=true;
      perform public.enqueue_automation_email(new.email,'payment_refused','payment_refused','payment-rejected:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    end if;
  end if;

  if tg_op='UPDATE' and new.status is distinct from old.status and not payment_changed then
    if new.status in('confirmado','confirmed') then
      perform public.enqueue_automation_email(new.email,'appointment_confirmed','appointment_confirmed','appointment-confirmed:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    elsif new.status='cancelado' then
      perform public.enqueue_automation_email(new.email,'cancellation','cancellation','appointment-cancelled:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    end if;
  end if;
  return new;
end;
$$;

-- Campanhas usam exclusivamente o modelo administrativo atual e somente
-- promoções explicitamente habilitadas para e-mail.
create or replace function public.prepare_promotion_emails()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare p record; c record;
begin
  for p in
    select * from public.promotions
    where status='active' and email_enabled
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>=now())
      and (usage_limit is null or usage_count<usage_limit)
  loop
    for c in
      select * from public.customer_accounts
      where is_active and promotions_authorized
        and promotions_consent_at is not null and promotions_revoked_at is null
        and nullif(trim(email),'') is not null
    loop
      if not exists(select 1 from public.promotion_email_history where promotion_id=p.id and customer_id=c.user_id) then
        perform public.enqueue_automation_email(
          c.email,'promotion','promotion','promotion:'||p.id||':'||c.user_id,
          jsonb_build_object(
            'customer_name',coalesce(c.full_name,split_part(c.email,'@',1)),
            'promotion_title',p.title,
            'promotion_description',p.short_description,
            'promotion_link',coalesce(p.button_target,'/servicos')
          ),
          jsonb_build_object('kind','promotion','promotion_id',p.id,'customer_id',c.user_id)
        );
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.prepare_promotion_emails() from public,anon,authenticated;
grant execute on function public.prepare_promotion_emails() to service_role;

-- O prazo já configurado passa a valer apenas para reservas realmente criadas
-- sem comprovante. Agendamentos com comprovante ou em análise não são afetados.
create or replace function public.expire_unpaid_reservations()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  deadline_minutes integer;
  expired_count integer;
begin
  select greatest(5,least(1440,case
    when coalesce(private_data->>'proof_deadline_minutes','') ~ '^\d+$'
      then (private_data->>'proof_deadline_minutes')::integer
    else 30
  end))
    into deadline_minutes from public.studio_settings where id='main';
  deadline_minutes:=coalesce(deadline_minutes,30);

  with expired as (
    update public.appointments
       set status='expirado',payment_status='expirado',cancelled_at=now(),cancelled_by='expiracao_comprovante',
           reason='Prazo para envio do comprovante expirado.'
     where payment_proof is null
       and status in('aguardando_pagamento','aguardando_comprovante')
       and payment_status in('aguardando_pagamento','aguardando_comprovante')
       and created_at<=now()-make_interval(mins=>deadline_minutes)
     returning id,customer_name,appointment_date
  ), notices as (
    insert into public.admin_notifications(appointment_id,type,title,message,category,action_url,event_key)
    select id::text,'reservation_expired','Reserva expirada sem comprovante',customer_name,'pagamento',
           '/admin/agenda?date='||appointment_date,'reservation-expired:'||id
      from expired
    on conflict(event_key) where event_key is not null do nothing
  )
  select count(*) into expired_count from expired;
  return expired_count;
end;
$$;

revoke all on function public.expire_unpaid_reservations() from public,anon,authenticated;
grant execute on function public.expire_unpaid_reservations() to service_role;

-- Reutiliza o executor horário existente: prepara o conteúdo diário mesmo
-- sem abertura do painel e aplica o prazo de comprovante já configurado.
create or replace function public.prepare_hourly_automation_emails()
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  a record;
  local_now timestamp:=(now() at time zone 'America/Sao_Paulo');
  local_today date:=(now() at time zone 'America/Sao_Paulo')::date;
  next_month date;
begin
  perform public.select_daily_verse(local_today,'morning');
  perform public.expire_unpaid_reservations();
  for a in
    select appointments.*,coalesce((select string_agg(service_name,', ') from public.appointment_services s where s.appointment_id=appointments.id),service_name,'Atendimento') names
      from public.appointments
     where status not in('cancelado','concluido','nao_compareceu','ausente','expirado')
       and reminder_sent_at is null
       and (appointment_date+appointment_time::time) between local_now+interval '23 hours' and local_now+interval '24 hours'
  loop
    perform public.enqueue_automation_email(a.email,'reminder_24h','reminder_24h','reminder-24h:'||a.id,
      jsonb_build_object('customer_name',a.customer_name,'appointment_time',left(a.appointment_time,5),'service_name',a.names),
      jsonb_build_object('kind','reminder_24h','appointment_id',a.id));
  end loop;
  perform public.create_monthly_schedule_release_reminders();
  if extract(day from local_today) in(20,25) or local_today=(date_trunc('month',local_today)+interval '1 month - 1 day')::date then
    next_month:=(date_trunc('month',local_today)+interval '1 month')::date;
    if not exists(select 1 from public.monthly_schedule_releases where year=extract(year from next_month)::int and month=extract(month from next_month)::int and status='released') then
      perform public.enqueue_automation_email('admin@invalid.local','schedule_release','schedule_release','schedule-release:'||local_today,
        jsonb_build_object('customer_name','Thaís','next_month',to_char(next_month,'MM/YYYY')),
        jsonb_build_object('kind','schedule_release','requires_admin_email',true));
    end if;
  end if;
  perform public.prepare_holiday_reminders();
end;
$$;

revoke all on function public.prepare_hourly_automation_emails() from public,anon,authenticated;
grant execute on function public.prepare_hourly_automation_emails() to service_role;
