-- Beauty Studio 1.0: feriados, conclusão manual e não comparecimento.
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name))>=3), holiday_date date not null,
  scope text not null check(scope in('nacional','estadual','municipal','personalizado')),
  city text, state text, is_active boolean not null default true, source text not null default 'manual',
  admin_decision text not null default 'pending' check(admin_decision in('pending','open_normal','closed','special_hours','promotion_planned')),
  notes text, reminder_sent_at timestamptz, reminder_days_sent integer[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null
);
create unique index if not exists holidays_date_scope_location_unique on public.holidays(holiday_date,scope,coalesce(city,''),coalesce(state,''));
alter table public.agenda_blocks drop constraint if exists agenda_blocks_reason_type_check;
alter table public.agenda_blocks add constraint agenda_blocks_reason_type_check check(reason_type in('compromisso','curso','ferias','manutencao','feriado','outro'));
alter table public.holidays enable row level security;
drop policy if exists "Admins manage holidays" on public.holidays;
create policy "Admins manage holidays" on public.holidays for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.appointments add column if not exists no_show_at timestamptz;
alter table public.appointments add column if not exists no_show_by uuid references auth.users(id) on delete set null;
alter table public.appointments add column if not exists no_show_reason text;
alter table public.appointments add column if not exists completion_notes text;

create or replace function public.admin_get_holidays(date_from date default current_date,date_to date default current_date+interval '1 year')
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('appointment_count',(select count(*) from public.appointments a where a.appointment_date=h.holiday_date and a.status<>'cancelado')) order by h.holiday_date) from public.holidays h where h.holiday_date between date_from and date_to),'[]'::jsonb);
end $$;

create or replace function public.admin_save_holiday(payload jsonb,target_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; decision text:=coalesce(payload->>'admin_decision','pending'); target_date date:=(payload->>'holiday_date')::date; existing_count integer; begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if decision not in('pending','open_normal','closed','special_hours','promotion_planned') then raise exception 'Decisão inválida'; end if;
  select count(*) into existing_count from public.appointments where appointment_date=target_date and status<>'cancelado';
  if decision='closed' and existing_count>0 and not coalesce((payload->>'appointments_reviewed')::boolean,false) then raise exception 'Existem atendimentos agendados para esta data. Revise cada um antes de fechar a agenda.'; end if;
  if target_id is null then
    insert into public.holidays(name,holiday_date,scope,city,state,source,admin_decision,notes,created_by,updated_by)
    values(trim(payload->>'name'),target_date,payload->>'scope',nullif(trim(payload->>'city'),''),nullif(trim(payload->>'state'),''),coalesce(nullif(payload->>'source',''),'manual'),decision,nullif(trim(payload->>'notes'),''),auth.uid(),auth.uid()) returning id into result;
  else
    update public.holidays set name=trim(payload->>'name'),holiday_date=target_date,scope=payload->>'scope',city=nullif(trim(payload->>'city'),''),state=nullif(trim(payload->>'state'),''),admin_decision=decision,notes=nullif(trim(payload->>'notes'),''),is_active=coalesce((payload->>'is_active')::boolean,is_active),updated_at=now(),updated_by=auth.uid() where id=target_id returning id into result;
  end if;
  if result is null then raise exception 'Feriado não encontrado'; end if;
  delete from public.agenda_blocks where reason_type='feriado' and reason='holiday:'||result;
  delete from public.special_schedule_hours where notes='holiday:'||result;
  if decision='closed' then insert into public.agenda_blocks(block_date,start_time,end_time,reason_type,reason) values(target_date,'00:00','23:59','feriado','holiday:'||result); end if;
  if decision='special_hours' then
    if nullif(payload->>'opening_time','') is null or nullif(payload->>'closing_time','') is null or (payload->>'opening_time')::time >= (payload->>'closing_time')::time then raise exception 'Informe um horário especial válido'; end if;
    insert into public.special_schedule_hours(special_date,opening_time,closing_time,break_start,break_end,notes,is_active)
    values(target_date,(payload->>'opening_time')::time,(payload->>'closing_time')::time,nullif(payload->>'break_start','')::time,nullif(payload->>'break_end','')::time,'holiday:'||result,true)
    on conflict(special_date) where special_date is not null do update set opening_time=excluded.opening_time,closing_time=excluded.closing_time,break_start=excluded.break_start,break_end=excluded.break_end,notes=excluded.notes,is_active=true;
  end if;
  insert into public.admin_notifications(type,title,message,category,action_url,event_key) values('holiday_decision',case when decision='closed' then 'Agenda fechada para feriado' else 'Funcionamento do feriado definido' end,payload->>'name','agenda mensal','/admin/agenda?holiday='||result,'holiday-decision:'||result||':'||decision) on conflict(event_key) where event_key is not null do nothing;
  return result;
end $$;

create or replace function public.admin_set_holiday_active(target_id uuid,active_value boolean)
returns void language plpgsql security definer set search_path=public as $$ begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  update public.holidays set is_active=active_value,updated_at=now(),updated_by=auth.uid() where id=target_id;
end $$;

insert into public.notification_preferences(id,email_enabled,priority) values('holiday_reminder',true,'normal'),('no_show',true,'normal') on conflict(id) do nothing;
insert into public.email_templates(id,subject,title,subtitle,body,signature,button_text,button_url,required_variables) values
('holiday_reminder','Um feriado está se aproximando','Um feriado está se aproximando','Defina como será o funcionamento do Beauty Studio nessa data.','<p><strong>{{holiday_name}}</strong> será em {{holiday_date}} ({{weekday}}), daqui a {{days_remaining}} dias.</p>','Thaís Santos Beauty Studio','Revisar agenda','{{site_url}}/admin/agenda?holiday={{holiday_id}}',array['{{holiday_name}}','{{holiday_date}}','{{weekday}}','{{days_remaining}}','{{holiday_id}}','{{site_url}}']),
('no_show','Atualização sobre seu atendimento • Beauty Studio','Sentimos sua falta hoje','Seu atendimento foi registrado como não comparecimento.','<p>Caso tenha ocorrido algum imprevisto, você pode acessar seu espaço para consultar seus atendimentos e realizar uma nova marcação.</p>','Thaís Santos Beauty Studio','Acessar Meu Espaço','{{site_url}}/minha-conta',array['{{site_url}}'])
on conflict(id) do update set subject=excluded.subject,title=excluded.title,subtitle=excluded.subtitle,body=excluded.body,button_text=excluded.button_text,button_url=excluded.button_url,required_variables=excluded.required_variables,updated_at=now();

create or replace function public.prepare_holiday_reminders() returns void language plpgsql security definer set search_path=public as $$
declare h record; days_left integer; begin
  for h in select * from public.holidays where is_active and admin_decision='pending' and holiday_date>=timezone('America/Sao_Paulo',now())::date loop
    days_left:=h.holiday_date-timezone('America/Sao_Paulo',now())::date;
    if days_left=any(array[15,7,2]) and not days_left=any(h.reminder_days_sent) then
      insert into public.admin_notifications(type,title,message,category,action_url,event_key) values('holiday_reminder','Um feriado está se aproximando',h.name||' • faltam '||days_left||' dias','agenda mensal','/admin/agenda?holiday='||h.id,'holiday-reminder:'||h.id||':'||days_left) on conflict(event_key) where event_key is not null do nothing;
      perform public.enqueue_automation_email('admin@invalid.local','holiday_reminder','holiday_reminder','holiday-email:'||h.id||':'||days_left,jsonb_build_object('holiday_name',h.name,'holiday_date',to_char(h.holiday_date,'DD/MM/YYYY'),'weekday',to_char(h.holiday_date,'TMDay'),'days_remaining',days_left,'holiday_id',h.id),jsonb_build_object('requires_admin_email',true,'holiday_id',h.id));
      update public.holidays set reminder_days_sent=array_append(reminder_days_sent,days_left),reminder_sent_at=now(),updated_at=now() where id=h.id;
    end if;
  end loop;
end $$;

revoke execute on function public.prepare_holiday_reminders() from public;
revoke execute on function public.prepare_holiday_reminders() from anon;
revoke execute on function public.prepare_holiday_reminders() from authenticated;
grant execute on function public.prepare_holiday_reminders() to service_role;

create or replace function public.admin_finalize_appointment(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.appointments%rowtype; mode text:=payload->>'mode'; received numeric:=coalesce(nullif(payload->>'payment_amount','')::numeric,0); fee numeric:=coalesce(nullif(payload->>'machine_fee','')::numeric,0); paid numeric; balance numeric; tx uuid; begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into a from public.appointments where id=(payload->>'appointment_id')::uuid for update;
  if not found then raise exception 'Agendamento não encontrado'; end if;
  if mode not in('complete','no_show') then raise exception 'Ação inválida'; end if;
  if a.status in('concluido','nao_compareceu') then return jsonb_build_object('status',a.status,'idempotent',true); end if;
  if a.status not in('confirmado','confirmed') then raise exception 'O atendimento não está em um estado elegível para finalização'; end if;
  if coalesce(a.payment_status,'') not in('confirmado','aprovado','approved','pago','paid') then raise exception 'O pagamento do atendimento ainda não está confirmado'; end if;
  select coalesce(sum(amount),0) into paid from public.financial_transactions where appointment_id=a.id and payment_status='received';
  balance:=greatest(coalesce(a.service_price,0)-paid,0);
  if mode='complete' and received>0 then
    if received>balance then raise exception 'Pagamento maior que o saldo'; end if;
    insert into public.financial_transactions(appointment_id,customer_id,transaction_type,amount,gross_amount,machine_fee,net_amount,payment_method,payment_status,received_at,created_by,notes,idempotency_key)
    values(a.id,a.user_id,case when received<balance then 'partial_payment' else 'remaining_payment' end,received,received,fee,received-fee,payload->>'payment_method','received',now(),auth.uid(),payload->>'notes','completion-payment:'||a.id) on conflict(idempotency_key) do nothing returning id into tx;
    paid:=paid+received; balance:=greatest(coalesce(a.service_price,0)-paid,0);
  end if;
  if mode='complete' and balance>0 and not coalesce((payload->>'keep_balance_pending')::boolean,false) then raise exception 'Existe saldo pendente. Registre o pagamento ou confirme que o saldo continuará pendente.'; end if;
  if mode='no_show' and length(trim(coalesce(payload->>'reason','')))<3 then raise exception 'Informe o motivo do não comparecimento'; end if;
  update public.appointments set status=case when mode='complete' then 'concluido' else 'nao_compareceu' end,remaining_amount=balance,
    completed_at=case when mode='complete' then now() else completed_at end,completed_by=case when mode='complete' then auth.uid() else completed_by end,completion_notes=case when mode='complete' then nullif(payload->>'notes','') else completion_notes end,
    no_show_at=case when mode='no_show' then now() else no_show_at end,no_show_by=case when mode='no_show' then auth.uid() else no_show_by end,no_show_reason=case when mode='no_show' then payload->>'reason' else no_show_reason end where id=a.id;
  if mode='no_show' then insert into public.request_activity(request_type,request_id,action,description,performed_by) values('agendamento',a.id::text,'nao_compareceu','Não comparecimento registrado.',auth.uid()); end if;
  insert into public.admin_notifications(appointment_id,type,title,message,category,action_url,event_key) values(a.id::text,case when mode='complete' then 'appointment_completed' else 'no_show' end,case when mode='complete' then 'Atendimento concluído' else 'Não comparecimento registrado' end,a.customer_name,'agendamento','/admin/agenda?date='||a.appointment_date,case when mode='complete' then 'appointment-completed:' else 'no-show:' end||a.id) on conflict(event_key) where event_key is not null do nothing;
  if mode='no_show' then perform public.enqueue_automation_email(a.email,'no_show','no_show','no-show-email:'||a.id,jsonb_build_object(),jsonb_build_object('appointment_id',a.id,'kind','no_show')); end if;
  return jsonb_build_object('status',case when mode='complete' then 'concluido' else 'nao_compareceu' end,'balance',balance,'payment_id',tx,'idempotent',false);
end $$;

create or replace function public.prepare_hourly_automation_emails() returns void language plpgsql security definer set search_path=public as $$
declare a record; local_now timestamp:=(now() at time zone 'America/Sao_Paulo'); local_today date:=(now() at time zone 'America/Sao_Paulo')::date; next_month date; begin
  for a in select appointments.*,coalesce((select string_agg(service_name,', ') from public.appointment_services s where s.appointment_id=appointments.id),service_name,'Atendimento') names from public.appointments where status not in('cancelado','concluido','nao_compareceu','ausente') and reminder_sent_at is null and (appointment_date+appointment_time::time) between local_now+interval '23 hours' and local_now+interval '24 hours' loop
    perform public.enqueue_automation_email(a.email,'reminder_24h','reminder_24h','reminder-24h:'||a.id,jsonb_build_object('customer_name',a.customer_name,'appointment_time',left(a.appointment_time,5),'service_name',a.names),jsonb_build_object('kind','reminder_24h','appointment_id',a.id));
  end loop;
  perform public.create_monthly_schedule_release_reminders();
  if extract(day from local_today) in(20,25) or local_today=(date_trunc('month',local_today)+interval '1 month - 1 day')::date then next_month:=(date_trunc('month',local_today)+interval '1 month')::date; if not exists(select 1 from public.monthly_schedule_releases where year=extract(year from next_month)::int and month=extract(month from next_month)::int and status='released') then perform public.enqueue_automation_email('admin@invalid.local','schedule_release','schedule_release','schedule-release:'||local_today,jsonb_build_object('customer_name','Thaís','next_month',to_char(next_month,'MM/YYYY')),jsonb_build_object('kind','schedule_release','requires_admin_email',true)); end if; end if;
  perform public.prepare_holiday_reminders();
end $$;

revoke execute on function public.prepare_hourly_automation_emails() from public;
revoke execute on function public.prepare_hourly_automation_emails() from anon;
revoke execute on function public.prepare_hourly_automation_emails() from authenticated;
grant execute on function public.prepare_hourly_automation_emails() to service_role;

revoke all on function public.admin_get_holidays(date,date),public.admin_save_holiday(jsonb,uuid),public.admin_set_holiday_active(uuid,boolean),public.admin_finalize_appointment(jsonb) from public;
revoke all on function public.admin_get_holidays(date,date),public.admin_save_holiday(jsonb,uuid),public.admin_set_holiday_active(uuid,boolean),public.admin_finalize_appointment(jsonb) from anon;
grant execute on function public.admin_get_holidays(date,date),public.admin_save_holiday(jsonb,uuid),public.admin_set_holiday_active(uuid,boolean),public.admin_finalize_appointment(jsonb) to authenticated;
