alter table public.booking_requests
  add column if not exists customer_id uuid references auth.users(id) on delete set null,
  add column if not exists preferred_period text,
  add column if not exists specific_time text,
  add column if not exists services_data jsonb not null default '[]'::jsonb,
  add column if not exists proposal_expires_at timestamptz,
  add column if not exists customer_response text,
  add column if not exists customer_response_reason text,
  add column if not exists customer_responded_at timestamptz,
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null;

create unique index if not exists booking_request_one_active_per_customer
  on public.booking_requests(customer_id, appointment_date, service_name)
  where status in ('pendente', 'pending_review', 'aguardando_resposta_cliente');

drop policy if exists "Clientes enviam solicitações de encaixe" on public.booking_requests;
drop policy if exists "Customers read own booking requests" on public.booking_requests;
create policy "Customers read own booking requests" on public.booking_requests
  for select to authenticated using (
    customer_id = auth.uid()
    or (customer_id is null and lower(trim(email)) = lower(trim(auth.jwt()->>'email')))
  );

create or replace function public.expire_fit_request_proposals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare expired_count integer;
begin
  with expired as (
    update public.booking_requests
    set status = 'expirado', customer_response = 'expirada', customer_responded_at = now()
    where status = 'aguardando_resposta_cliente'
      and proposal_expires_at <= now()
    returning *
  ), activity as (
    insert into public.request_activity(request_type, request_id, action, description)
    select 'encaixe', id::text, 'expirado', 'A proposta expirou após 24 horas.' from expired
  ), admin_notice as (
    insert into public.admin_notifications(appointment_id, type, title, message)
    select null, 'fit_proposal_expired', 'Proposta de encaixe expirada', customer_name from expired
  )
  insert into public.customer_notifications(user_id, type, title, message, related_id)
  select customer_id, 'fit_expired', 'Proposta de encaixe expirada',
    'O prazo para aceitar o horário sugerido terminou.', id::text
  from expired where customer_id is not null;

  get diagnostics expired_count = row_count;
  return expired_count;
end $$;

create or replace function public.customer_create_fit_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare created public.booking_requests%rowtype; desired_date date; customer_email text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para solicitar um encaixe'; end if;
  desired_date := (payload->>'appointment_date')::date;
  customer_email := lower(trim(auth.jwt()->>'email'));
  if desired_date < current_date then raise exception 'Escolha uma data futura'; end if;
  if nullif(trim(payload->>'service_name'), '') is null or coalesce((payload->>'duration_minutes')::integer, 0) <= 0 then raise exception 'Selecione ao menos um serviço'; end if;
  if coalesce(payload->>'preferred_period', '') not in ('manha','tarde','qualquer') then raise exception 'Escolha um período de preferência'; end if;
  if not exists(
    select 1 from public.monthly_schedule_releases r
    where r.year=extract(year from desired_date)::integer and r.month=extract(month from desired_date)::integer
      and r.status='released' and not desired_date=any(r.blocked_dates)
  ) then raise exception 'A agenda desta data não está liberada'; end if;
  if exists(
    select 1 from public.booking_requests r where r.customer_id=auth.uid()
      and r.appointment_date=desired_date and r.service_name=payload->>'service_name'
      and r.status in ('pendente','pending_review','aguardando_resposta_cliente')
  ) then raise exception 'Você já possui uma solicitação de encaixe para esta data e serviço'; end if;

  insert into public.booking_requests(
    customer_id,service_id,service_name,duration_minutes,total_duration_minutes,
    customer_name,phone,email,notes,image_authorization,appointment_date,appointment_time,
    preferred_period,specific_time,services_data,status,total_price,reservation_amount,remaining_amount
  ) values (
    auth.uid(),nullif(payload->>'service_id','')::bigint,payload->>'service_name',
    (payload->>'duration_minutes')::integer,(payload->>'duration_minutes')::integer,
    payload->>'customer_name',payload->>'phone',coalesce(nullif(payload->>'email',''),customer_email),
    left(nullif(trim(payload->>'notes'),''),500),(payload->>'image_authorization')::boolean,
    desired_date,coalesce(nullif(payload->>'specific_time',''),case payload->>'preferred_period' when 'tarde' then '13:30' else '08:00' end),
    payload->>'preferred_period',nullif(payload->>'specific_time',''),coalesce(payload->'services_data','[]'::jsonb),
    'pendente',(payload->>'total_price')::numeric,(payload->>'reservation_amount')::numeric,(payload->>'remaining_amount')::numeric
  ) returning * into created;

  insert into public.request_activity(request_type,request_id,action,description,performed_by)
  values('encaixe',created.id::text,'criada',created.notes,auth.uid());
  insert into public.admin_notifications(type,title,message)
  values('fit_request','Nova solicitação de encaixe',created.customer_name||' solicitou encaixe para '||created.appointment_date);
  return to_jsonb(created);
end $$;

create or replace function public.admin_review_booking_request(
  target_request_id uuid, action_name text, target_date date default null,
  target_time text default null, admin_text text default null, refusal_reason text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare req public.booking_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  perform public.expire_fit_request_proposals();
  select * into req from public.booking_requests where id=target_request_id for update;
  if not found then raise exception 'Solicitação não encontrada'; end if;
  if req.status not in ('pendente','pending_review','proposta_recusada') then raise exception 'Esta solicitação já foi analisada'; end if;
  if action_name not in ('aprovar','sugerir','recusar') then raise exception 'Ação inválida'; end if;
  if action_name='recusar' and nullif(trim(refusal_reason),'') is null then raise exception 'Informe o motivo'; end if;
  if action_name in ('aprovar','sugerir') then
    target_date:=coalesce(target_date,req.appointment_date); target_time:=coalesce(target_time,req.specific_time,req.appointment_time);
    perform public.assert_appointment_slot_available(target_date,target_time,coalesce(req.total_duration_minutes,req.duration_minutes),null);
  end if;
  update public.booking_requests set
    status=case when action_name in ('aprovar','sugerir') then 'aguardando_resposta_cliente' else 'recusado' end,
    proposed_date=case when action_name in ('aprovar','sugerir') then target_date else null end,
    proposed_time=case when action_name in ('aprovar','sugerir') then left(target_time,5) else null end,
    proposal_expires_at=case when action_name in ('aprovar','sugerir') then now()+interval '24 hours' else null end,
    admin_message=admin_text,rejection_reason=refusal_reason,reviewed_at=now(),reviewed_by=auth.uid()
  where id=req.id returning * into req;
  insert into public.request_activity(request_type,request_id,action,description,performed_by)
  values('encaixe',req.id::text,case when action_name in ('aprovar','sugerir') then 'horario_sugerido' else 'recusado' end,coalesce(admin_text,refusal_reason),auth.uid());
  if req.customer_id is not null then
    insert into public.customer_notifications(user_id,type,title,message,related_id)
    values(req.customer_id,case when action_name='recusar' then 'fit_rejected' else 'fit_proposed' end,
      case when action_name='recusar' then 'Solicitação de encaixe recusada' else 'Novo horário de encaixe sugerido' end,
      coalesce(admin_text,case when action_name='recusar' then refusal_reason else target_date||' às '||left(target_time,5) end),req.id::text);
  end if;
  return to_jsonb(req);
end $$;

create or replace function public.customer_respond_fit_proposal(target_request_id uuid, accepted boolean, response_reason text default null)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare req public.booking_requests%rowtype; created_id uuid; ending integer; duration integer; service jsonb;
begin
  perform public.expire_fit_request_proposals();
  select * into req from public.booking_requests where id=target_request_id and customer_id=auth.uid() for update;
  if not found or req.status<>'aguardando_resposta_cliente' then raise exception 'Esta proposta não está mais disponível'; end if;
  if not accepted then
    update public.booking_requests set status='proposta_recusada',customer_response='recusada',customer_response_reason=left(nullif(trim(response_reason),''),500),customer_responded_at=now() where id=req.id returning * into req;
    insert into public.request_activity(request_type,request_id,action,description,performed_by) values('encaixe',req.id::text,'proposta_recusada',req.customer_response_reason,auth.uid());
    insert into public.admin_notifications(type,title,message) values('fit_proposal_rejected','Cliente recusou proposta de encaixe',req.customer_name);
    return jsonb_build_object('success',true,'request',to_jsonb(req));
  end if;
  duration:=coalesce(req.total_duration_minutes,req.duration_minutes);
  begin
    perform public.assert_appointment_slot_available(req.proposed_date,req.proposed_time,duration,null);
  exception when others then
    update public.booking_requests set status='pending_review',admin_message='O horário sugerido deixou de estar disponível.',customer_responded_at=now() where id=req.id;
    insert into public.request_activity(request_type,request_id,action,description,performed_by) values('encaixe',req.id::text,'conflito_na_aceitacao','Horário indisponível; voltou para análise.',auth.uid());
    insert into public.admin_notifications(type,title,message) values('fit_conflict','Encaixe voltou para análise',req.customer_name);
    return jsonb_build_object('success',false,'message','O horário sugerido não está mais disponível.');
  end;
  ending:=split_part(req.proposed_time,':',1)::int*60+split_part(req.proposed_time,':',2)::int+duration;
  insert into public.appointments(
    user_id,service_id,service_name,customer_name,phone,email,notes,appointment_date,appointment_time,end_time,
    status,payment_status,reservation_paid,image_authorization,reservation_policy_accepted,service_price,reservation_amount,remaining_amount,duration_minutes,total_duration_minutes
  ) values(
    auth.uid(),req.service_id,req.service_name,req.customer_name,req.phone,req.email,req.notes,req.proposed_date,left(req.proposed_time,5),
    lpad((ending/60)::text,2,'0')||':'||lpad((ending%60)::text,2,'0'),'aguardando_comprovante','aguardando_comprovante',false,req.image_authorization,true,
    coalesce(req.total_price,0),coalesce(req.reservation_amount,0),coalesce(req.remaining_amount,0),req.duration_minutes,duration
  ) returning id into created_id;
  for service in select * from jsonb_array_elements(req.services_data) loop
    insert into public.appointment_services(appointment_id,service_id,service_name,duration_minutes,service_price,reservation_amount)
    values(created_id,(service->>'service_id')::bigint,service->>'service_name',(service->>'duration_minutes')::integer,coalesce((service->>'service_price')::numeric,0),coalesce((service->>'reservation_amount')::numeric,0));
  end loop;
  update public.booking_requests set status='aguardando_comprovante',customer_response='aceita',customer_responded_at=now(),appointment_id=created_id where id=req.id returning * into req;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('encaixe',req.id::text,'proposta_aceita','Agendamento criado; aguardando comprovante.',auth.uid());
  insert into public.admin_notifications(appointment_id,type,title,message) values(created_id::text,'fit_accepted','Cliente aceitou o encaixe',req.customer_name);
  return jsonb_build_object('success',true,'request',to_jsonb(req),'appointment_id',created_id);
end $$;

create or replace function public.customer_submit_fit_payment(target_request_id uuid, proof_path text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare req public.booking_requests%rowtype; appt public.appointments%rowtype;
begin
  select * into req from public.booking_requests where id=target_request_id and customer_id=auth.uid() for update;
  if not found or req.status<>'aguardando_comprovante' or nullif(trim(proof_path),'') is null then raise exception 'Este encaixe não está disponível para pagamento'; end if;
  update public.appointments set payment_proof=proof_path,payment_status='em_analise',status='aguardando_aprovacao' where id=req.appointment_id returning * into appt;
  update public.booking_requests set payment_proof=proof_path,status='aguardando_aprovacao' where id=req.id returning * into req;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('encaixe',req.id::text,'comprovante_enviado','Comprovante enviado para análise.',auth.uid());
  insert into public.admin_notifications(appointment_id,type,title,message) values(appt.id::text,'payment_review','Novo comprovante para análise',appt.customer_name);
  return jsonb_build_object('request',to_jsonb(req),'appointment',to_jsonb(appt));
end $$;

revoke all on function public.expire_fit_request_proposals() from public;
revoke all on function public.customer_create_fit_request(jsonb) from public;
revoke all on function public.customer_respond_fit_proposal(uuid,boolean,text) from public;
revoke all on function public.customer_submit_fit_payment(uuid,text) from public;
grant execute on function public.customer_create_fit_request(jsonb) to authenticated;
grant execute on function public.customer_respond_fit_proposal(uuid,boolean,text) to authenticated;
grant execute on function public.customer_submit_fit_payment(uuid,text) to authenticated;

do $$
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron;
    if not exists(select 1 from cron.job where jobname='expire-fit-request-proposals') then
      perform cron.schedule(
        'expire-fit-request-proposals',
        '*/15 * * * *',
        'select public.expire_fit_request_proposals();'
      );
    end if;
  end if;
exception when others then
  raise notice 'A expiração automática de encaixes não pôde ser agendada: %', sqlerrm;
end $$;

create or replace function public.get_customer_space() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); email_value text:=lower(trim(auth.jwt()->>'email')); appointments_json jsonb; promotion_json jsonb; reschedules_json jsonb; notifications_json jsonb; fits_json jsonb;
begin
  if uid is null then raise exception 'É necessário estar autenticada para acessar esta área'; end if;
  perform public.expire_fit_request_proposals();
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'serviceName',a.service_name,'date',a.appointment_date,'time',left(a.appointment_time,5),'value',a.service_price,'status',a.status,'durationMinutes',coalesce(a.total_duration_minutes,a.duration_minutes),'reservationAmount',a.reservation_amount,'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.service_id,'name',s.service_name,'durationMinutes',s.duration_minutes,'price',s.service_price) order by s.id) from public.appointment_services s where s.appointment_id=a.id),'[]'::jsonb)) order by a.appointment_date desc,a.appointment_time desc),'[]'::jsonb) into appointments_json from public.appointments a where a.user_id=uid or (a.user_id is null and lower(trim(a.email))=email_value);
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into reschedules_json from public.reschedule_requests r join public.appointments a on a.id=r.appointment_id where a.user_id=uid or (a.user_id is null and lower(trim(a.email))=email_value);
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) into notifications_json from public.customer_notifications n where n.user_id=uid;
  select coalesce(jsonb_agg(to_jsonb(b) order by b.created_at desc),'[]'::jsonb) into fits_json from public.booking_requests b where b.customer_id=uid or (b.customer_id is null and lower(trim(b.email))=email_value);
  select jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'link',p.link) into promotion_json from public.promotions p where p.active and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>=now()) order by p.created_at desc limit 1;
  return jsonb_build_object('appointments',appointments_json,'promotion',promotion_json,'reschedules',reschedules_json,'notifications',notifications_json,'fitRequests',fits_json);
end $$;
