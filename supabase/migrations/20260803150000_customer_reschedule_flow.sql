alter table public.reschedule_requests
  add column if not exists customer_id uuid references auth.users(id) on delete set null,
  add column if not exists original_date date,
  add column if not exists original_time text,
  add column if not exists customer_response text,
  add column if not exists customer_responded_at timestamptz;

create unique index if not exists reschedule_one_pending_per_appointment
  on public.reschedule_requests(appointment_id)
  where status in ('pendente', 'aguardando_resposta_cliente');

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_notifications enable row level security;
drop policy if exists "Customers read own notifications" on public.customer_notifications;
create policy "Customers read own notifications" on public.customer_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Customers read own reschedule requests" on public.reschedule_requests;
create policy "Customers read own reschedule requests" on public.reschedule_requests
  for select to authenticated using (
    exists(
      select 1 from public.appointments a
      where a.id = appointment_id
        and (
          a.user_id = auth.uid()
          or (a.user_id is null and lower(trim(a.email)) = lower(trim(auth.jwt()->>'email')))
        )
    )
  );

create or replace function public.assert_appointment_slot_available(
  target_date date,
  target_time text,
  target_duration integer,
  ignored_appointment_id uuid default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  release_row public.monthly_schedule_releases%rowtype;
  schedule jsonb;
  day_schedule jsonb;
  monthly_special jsonb;
  special_row public.special_schedule_hours%rowtype;
  opening_minutes integer;
  closing_minutes integer;
  break_start_minutes integer;
  break_end_minutes integer;
  starting integer;
  ending integer;
begin
  if target_date < current_date then raise exception 'A data escolhida já passou'; end if;
  if target_duration is null or target_duration <= 0 then raise exception 'Duração inválida'; end if;

  select * into release_row from public.monthly_schedule_releases
   where year = extract(year from target_date)::integer
     and month = extract(month from target_date)::integer and status = 'released';
  if not found then raise exception 'A agenda deste mês ainda não foi liberada'; end if;
  if target_date = any(release_row.blocked_dates) then raise exception 'Esta data está bloqueada'; end if;

  select settings into schedule from public.schedule_settings where id = 'default';
  day_schedule := schedule->'days'->(extract(dow from target_date)::integer)::text;
  if coalesce((day_schedule->>'active')::boolean, false) is not true then raise exception 'O estúdio não atende neste dia'; end if;

  monthly_special := release_row.special_hours->target_date::text;
  if monthly_special is not null then
    opening_minutes := split_part(monthly_special->>'opening', ':', 1)::int * 60 + split_part(monthly_special->>'opening', ':', 2)::int;
    closing_minutes := split_part(monthly_special->>'closing', ':', 1)::int * 60 + split_part(monthly_special->>'closing', ':', 2)::int;
    break_start_minutes := split_part(monthly_special->>'breakStart', ':', 1)::int * 60 + split_part(monthly_special->>'breakStart', ':', 2)::int;
    break_end_minutes := split_part(monthly_special->>'breakEnd', ':', 1)::int * 60 + split_part(monthly_special->>'breakEnd', ':', 2)::int;
  else
    select * into special_row from public.special_schedule_hours h
     where h.is_active and (h.special_date = target_date or h.weekday = extract(dow from target_date)::smallint)
     order by (h.special_date is not null) desc limit 1;
    if found then
      opening_minutes := extract(hour from special_row.opening_time)::int * 60 + extract(minute from special_row.opening_time)::int;
      closing_minutes := extract(hour from special_row.closing_time)::int * 60 + extract(minute from special_row.closing_time)::int;
      if special_row.break_start is not null then
        break_start_minutes := extract(hour from special_row.break_start)::int * 60 + extract(minute from special_row.break_start)::int;
        break_end_minutes := extract(hour from special_row.break_end)::int * 60 + extract(minute from special_row.break_end)::int;
      end if;
    else
      opening_minutes := split_part(day_schedule->>'open', ':', 1)::int * 60 + split_part(day_schedule->>'open', ':', 2)::int;
      closing_minutes := split_part(day_schedule->>'close', ':', 1)::int * 60 + split_part(day_schedule->>'close', ':', 2)::int;
      if nullif(day_schedule->>'break_start', '') is not null then
        break_start_minutes := split_part(day_schedule->>'break_start', ':', 1)::int * 60 + split_part(day_schedule->>'break_start', ':', 2)::int;
        break_end_minutes := split_part(day_schedule->>'break_end', ':', 1)::int * 60 + split_part(day_schedule->>'break_end', ':', 2)::int;
      end if;
    end if;
  end if;

  starting := split_part(target_time, ':', 1)::int * 60 + split_part(target_time, ':', 2)::int;
  ending := starting + target_duration;
  if starting < opening_minutes or ending > closing_minutes then raise exception 'O atendimento não cabe no expediente'; end if;
  if break_start_minutes is not null and starting < break_end_minutes and ending > break_start_minutes then raise exception 'O atendimento atravessa o intervalo'; end if;
  if target_date = current_date and starting <= extract(hour from localtime)::int * 60 + extract(minute from localtime)::int then raise exception 'Este horário já passou'; end if;

  if exists(select 1 from public.agenda_blocks b where b.block_date = target_date
    and starting < extract(hour from b.end_time)::int*60 + extract(minute from b.end_time)::int
    and ending > extract(hour from b.start_time)::int*60 + extract(minute from b.start_time)::int) then
    raise exception 'Este horário está bloqueado';
  end if;
  if exists(select 1 from public.appointments a where a.id is distinct from ignored_appointment_id
    and a.appointment_date = target_date and a.status <> 'cancelado'
    and starting < split_part(coalesce(a.end_time,a.appointment_time),':',1)::int*60 + split_part(coalesce(a.end_time,a.appointment_time),':',2)::int
    and ending > split_part(a.appointment_time,':',1)::int*60 + split_part(a.appointment_time,':',2)::int) then
    raise exception 'Este horário não está mais disponível';
  end if;
end $$;

revoke all on function public.assert_appointment_slot_available(date, text, integer, uuid) from public;

create or replace function public.customer_create_reschedule_request(
  target_appointment_id uuid, target_date date, target_time text, customer_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare appt public.appointments%rowtype; created public.reschedule_requests%rowtype; customer_email text;
begin
  if auth.uid() is null then raise exception 'Sua sessão expirou. Entre novamente'; end if;
  customer_email := lower(trim(auth.jwt()->>'email'));
  select * into appt from public.appointments where id = target_appointment_id for update;
  if not found or not (appt.user_id = auth.uid() or (appt.user_id is null and lower(trim(appt.email)) = customer_email)) then raise exception 'Agendamento não encontrado'; end if;
  if appt.appointment_date < current_date or (appt.appointment_date = current_date and appt.appointment_time::time <= localtime) then raise exception 'Este atendimento já começou'; end if;
  if appt.status not in ('confirmado','aprovado') then raise exception 'Este agendamento não permite remarcação'; end if;
  if exists(select 1 from public.reschedule_requests r where r.appointment_id=appt.id and r.status in ('pendente','aguardando_resposta_cliente')) then raise exception 'Já existe uma solicitação em análise'; end if;
  if target_date=appt.appointment_date and left(target_time,5)=left(appt.appointment_time,5) then raise exception 'Escolha uma data ou horário diferente'; end if;
  perform public.assert_appointment_slot_available(target_date,target_time,coalesce(appt.total_duration_minutes,appt.duration_minutes),appt.id);
  insert into public.reschedule_requests(appointment_id,customer_id,original_date,original_time,requested_date,requested_time,reason,status)
  values(appt.id,auth.uid(),appt.appointment_date,left(appt.appointment_time,5),target_date,left(target_time,5),left(nullif(trim(customer_reason),''),500),'pendente') returning * into created;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('remarcacao',created.id::text,'criada',created.reason,auth.uid());
  insert into public.admin_notifications(appointment_id,type,title,message) values(appt.id::text,'reschedule_request','Nova solicitação de remarcação',concat(appt.customer_name,' solicitou ',target_date,' às ',left(target_time,5)));
  return to_jsonb(created);
end $$;

create or replace function public.customer_cancel_reschedule_request(target_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare req public.reschedule_requests%rowtype;
begin
  update public.reschedule_requests r set status='cancelado_cliente',customer_response='cancelada',customer_responded_at=now()
   where r.id=target_request_id and r.customer_id=auth.uid() and r.status='pendente' returning * into req;
  if not found then raise exception 'A solicitação não está mais disponível para cancelamento'; end if;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('remarcacao',req.id::text,'cancelada_cliente','Solicitação cancelada pela cliente.',auth.uid());
  return to_jsonb(req);
end $$;

create or replace function public.customer_respond_reschedule_proposal(target_request_id uuid, accepted boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare req public.reschedule_requests%rowtype; appt public.appointments%rowtype; duration integer; ending integer;
begin
  select * into req from public.reschedule_requests where id=target_request_id and customer_id=auth.uid() for update;
  if not found or req.status<>'aguardando_resposta_cliente' then raise exception 'Esta proposta não está mais disponível'; end if;
  select * into appt from public.appointments where id=req.appointment_id for update;
  if accepted then
    duration:=coalesce(appt.total_duration_minutes,appt.duration_minutes);
    perform public.assert_appointment_slot_available(req.proposed_date,req.proposed_time,duration,appt.id);
    ending:=split_part(req.proposed_time,':',1)::int*60+split_part(req.proposed_time,':',2)::int+duration;
    update public.appointments set appointment_date=req.proposed_date,appointment_time=left(req.proposed_time,5),end_time=lpad((ending/60)::text,2,'0')||':'||lpad((ending%60)::text,2,'0') where id=appt.id;
    update public.reschedule_requests set status='aprovado',customer_response='aceita',customer_responded_at=now() where id=req.id returning * into req;
  else
    update public.reschedule_requests set status='proposta_recusada',customer_response='recusada',customer_responded_at=now() where id=req.id returning * into req;
    insert into public.admin_notifications(appointment_id,type,title,message) values(appt.id::text,'reschedule_proposal_rejected','Proposta de horário não aceita',appt.customer_name);
  end if;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('remarcacao',req.id::text,case when accepted then 'proposta_aceita' else 'proposta_recusada' end,null,auth.uid());
  return to_jsonb(req);
end $$;

create or replace function public.get_reschedule_booked_times(target_date date, ignored_appointment_id uuid)
returns table(appointment_time text,duration_minutes integer)
language sql stable security definer set search_path=public as $$
  select left(a.appointment_time,5),coalesce(a.total_duration_minutes,a.duration_minutes)
  from public.appointments a where a.appointment_date=target_date and a.status<>'cancelado' and a.id is distinct from ignored_appointment_id;
$$;

revoke all on function public.customer_create_reschedule_request(uuid,date,text,text) from public;
revoke all on function public.customer_cancel_reschedule_request(uuid) from public;
revoke all on function public.customer_respond_reschedule_proposal(uuid,boolean) from public;
revoke all on function public.get_reschedule_booked_times(date,uuid) from public;
grant execute on function public.customer_create_reschedule_request(uuid,date,text,text) to authenticated;
grant execute on function public.customer_cancel_reschedule_request(uuid) to authenticated;
grant execute on function public.customer_respond_reschedule_proposal(uuid,boolean) to authenticated;
grant execute on function public.get_reschedule_booked_times(date,uuid) to authenticated;

create or replace function public.admin_review_reschedule_request(
  target_request_id uuid, action_name text, target_date date default null,
  target_time text default null, admin_text text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare req public.reschedule_requests%rowtype; appt public.appointments%rowtype; duration integer; ending integer;
begin
  if not public.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
  select * into req from public.reschedule_requests where id=target_request_id for update;
  select * into appt from public.appointments where id=req.appointment_id for update;
  if req.id is null or appt.id is null then raise exception 'Remarcação não encontrada'; end if;
  if req.status not in ('pendente','proposta_recusada') then raise exception 'Este pedido já foi analisado'; end if;
  if action_name not in ('aprovar','sugerir','recusar') then raise exception 'Ação inválida'; end if;
  if action_name in ('aprovar','sugerir') then
    target_date:=coalesce(target_date,req.requested_date); target_time:=coalesce(target_time,req.requested_time);
    duration:=coalesce(appt.total_duration_minutes,appt.duration_minutes);
    perform public.assert_appointment_slot_available(target_date,target_time,duration,appt.id);
  end if;
  if action_name='aprovar' then
    ending:=split_part(target_time,':',1)::int*60+split_part(target_time,':',2)::int+duration;
    update public.appointments set appointment_date=target_date,appointment_time=left(target_time,5),end_time=lpad((ending/60)::text,2,'0')||':'||lpad((ending%60)::text,2,'0') where id=appt.id;
  end if;
  update public.reschedule_requests set status=case action_name when 'aprovar' then 'aprovado' when 'sugerir' then 'aguardando_resposta_cliente' else 'recusado' end,
    proposed_date=case when action_name='sugerir' then target_date else proposed_date end,proposed_time=case when action_name='sugerir' then left(target_time,5) else proposed_time end,
    admin_message=admin_text,reviewed_by=auth.uid(),reviewed_at=now() where id=req.id returning * into req;
  insert into public.request_activity(request_type,request_id,action,description,performed_by) values('remarcacao',req.id::text,action_name,admin_text,auth.uid());
  insert into public.customer_notifications(user_id,type,title,message,related_id) values(coalesce(appt.user_id,req.customer_id),'reschedule_'||req.status,
    case when action_name='aprovar' then 'Remarcação aprovada' when action_name='sugerir' then 'Novo horário sugerido' else 'Remarcação recusada' end,
    coalesce(admin_text,case when action_name='aprovar' then 'Seu agendamento foi atualizado.' when action_name='sugerir' then concat(target_date,' às ',left(target_time,5)) else 'Seu agendamento original foi mantido.' end),req.id::text);
  return to_jsonb(req);
end $$;

create or replace function public.get_customer_space() returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); email_value text:=lower(trim(auth.jwt()->>'email')); appointments_json jsonb; promotion_json jsonb; reschedules_json jsonb; notifications_json jsonb;
begin
  if uid is null then raise exception 'É necessário estar autenticada para acessar esta área'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'serviceName',a.service_name,'date',a.appointment_date,'time',left(a.appointment_time,5),'value',a.service_price,'status',a.status,'durationMinutes',coalesce(a.total_duration_minutes,a.duration_minutes),'reservationAmount',a.reservation_amount,'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.service_id,'name',s.service_name,'durationMinutes',s.duration_minutes,'price',s.service_price) order by s.id) from public.appointment_services s where s.appointment_id=a.id),'[]'::jsonb)) order by a.appointment_date desc,a.appointment_time desc),'[]'::jsonb) into appointments_json
  from public.appointments a where a.user_id=uid or (a.user_id is null and lower(trim(a.email))=email_value);
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into reschedules_json from public.reschedule_requests r join public.appointments a on a.id=r.appointment_id where a.user_id=uid or (a.user_id is null and lower(trim(a.email))=email_value);
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) into notifications_json from public.customer_notifications n where n.user_id=uid;
  select jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'link',p.link) into promotion_json from public.promotions p where p.active and (p.starts_at is null or p.starts_at<=now()) and (p.ends_at is null or p.ends_at>=now()) order by p.created_at desc limit 1;
  return jsonb_build_object('appointments',appointments_json,'promotion',promotion_json,'reschedules',reschedules_json,'notifications',notifications_json);
end $$;
