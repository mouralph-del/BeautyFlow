create table if not exists public.admin_notification_preferences (
  admin_user_id uuid primary key references auth.users(id) on delete cascade,
  panel_notifications_enabled boolean not null default true,
  email_notifications_enabled boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.admin_notification_preferences enable row level security;
drop policy if exists "Admins manage individual notification preferences" on public.admin_notification_preferences;
create policy "Admins manage individual notification preferences" on public.admin_notification_preferences
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_admin_email_recipients(fallback_email text)
returns table(admin_user_id uuid, recipient text)
language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Acesso negado'; end if;
  insert into public.admin_notification_preferences(admin_user_id,email_notifications_enabled)
  select u.id, lower(trim(u.email))=lower(trim(fallback_email))
  from auth.users u where u.raw_app_meta_data->>'role'='admin'
  on conflict(admin_user_id) do nothing;
  return query
    select p.admin_user_id, lower(trim(u.email))
    from public.admin_notification_preferences p join auth.users u on u.id=p.admin_user_id
    where p.is_active and p.email_notifications_enabled
      and u.raw_app_meta_data->>'role'='admin' and nullif(trim(u.email),'') is not null;
end $$;
revoke all on function public.get_admin_email_recipients(text) from public,anon,authenticated;
grant execute on function public.get_admin_email_recipients(text) to service_role;

create or replace function public.admin_save_individual_notification_preference(target_admin uuid,panel_enabled boolean,email_enabled boolean,active_value boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if not exists(select 1 from auth.users where id=target_admin and raw_app_meta_data->>'role'='admin') then raise exception 'Conta administrativa não encontrada'; end if;
  insert into public.admin_notification_preferences(admin_user_id,panel_notifications_enabled,email_notifications_enabled,is_active,updated_at)
  values(target_admin,panel_enabled,email_enabled,active_value,now())
  on conflict(admin_user_id) do update set panel_notifications_enabled=excluded.panel_notifications_enabled,email_notifications_enabled=excluded.email_notifications_enabled,is_active=excluded.is_active,updated_at=now();
end $$;
revoke all on function public.admin_save_individual_notification_preference(uuid,boolean,boolean,boolean) from public;
grant execute on function public.admin_save_individual_notification_preference(uuid,boolean,boolean,boolean) to authenticated;

drop policy if exists "Customers update own account" on public.customer_accounts;
create policy "Customers update own account" on public.customer_accounts for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.get_own_customer_profile()
returns jsonb language plpgsql security definer set search_path=public as $$
declare account public.customer_accounts%rowtype; authenticated_email text;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  authenticated_email:=lower(trim(auth.jwt()->>'email'));
  insert into public.customer_accounts(user_id,email) values(auth.uid(),authenticated_email) on conflict(user_id) do nothing;
  select * into account from public.customer_accounts where user_id=auth.uid();
  return jsonb_build_object('full_name',account.full_name,'phone',account.phone,'email',authenticated_email,'is_complete',nullif(trim(account.full_name),'') is not null and length(regexp_replace(coalesce(account.phone,''),'\D','','g')) between 10 and 11);
end $$;

create or replace function public.save_own_customer_profile(full_name_value text,phone_value text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare authenticated_email text; digits text;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  authenticated_email:=lower(trim(auth.jwt()->>'email')); digits:=regexp_replace(coalesce(phone_value,''),'\D','','g');
  if length(trim(coalesce(full_name_value,'')))<3 then raise exception 'Informe o nome completo'; end if;
  if length(digits) not between 10 and 11 then raise exception 'Informe um WhatsApp válido'; end if;
  insert into public.customer_accounts(user_id,email,full_name,phone,updated_at)
  values(auth.uid(),authenticated_email,trim(full_name_value),trim(phone_value),now())
  on conflict(user_id) do update set email=authenticated_email,full_name=excluded.full_name,phone=excluded.phone,updated_at=now();
  return jsonb_build_object('full_name',trim(full_name_value),'phone',trim(phone_value),'email',authenticated_email,'is_complete',true);
end $$;
revoke all on function public.get_own_customer_profile() from public;
revoke all on function public.save_own_customer_profile(text,text) from public;
grant execute on function public.get_own_customer_profile() to authenticated;
grant execute on function public.save_own_customer_profile(text,text) to authenticated;

alter table public.appointments add column if not exists reservation_policy_accepted_at timestamptz;
alter table public.appointments add column if not exists image_authorization_policy_version_id uuid references public.policy_versions(id) on delete restrict;

create or replace function public.create_appointment_with_services(appointment_data jsonb,services_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare created_appointment public.appointments%rowtype; active_reservation_policy_id uuid; active_image_policy_id uuid; effective_email text;
begin
  if appointment_data is null then raise exception 'appointment_data é obrigatório'; end if;
  if services_data is null or jsonb_typeof(services_data)<>'array' or jsonb_array_length(services_data)=0 then raise exception 'services_data deve conter pelo menos um serviço'; end if;
  if coalesce((appointment_data->>'reservation_policy_accepted')::boolean,false) is not true then raise exception 'É necessário aceitar a política de reserva para criar o agendamento'; end if;
  select id into active_reservation_policy_id from public.policy_versions where policy_type='reservation' and is_active order by version desc limit 1;
  select id into active_image_policy_id from public.policy_versions where policy_type='image_authorization' and is_active order by version desc limit 1;
  if active_reservation_policy_id is null then raise exception 'Não existe uma política de reserva ativa'; end if;
  effective_email:=case when auth.uid() is null then lower(trim(appointment_data->>'email')) else lower(trim(auth.jwt()->>'email')) end;
  insert into public.appointments(customer_name,phone,email,user_id,notes,appointment_date,appointment_time,end_time,status,payment_status,reservation_paid,image_authorization,reservation_policy_accepted,reservation_policy_version_id,reservation_policy_accepted_at,image_authorization_policy_version_id,service_price,reservation_amount,remaining_amount,payment_proof,duration_minutes,total_duration_minutes)
  select payload.customer_name,payload.phone,effective_email,auth.uid(),payload.notes,payload.appointment_date,payload.appointment_time,payload.end_time,payload.status,payload.payment_status,payload.reservation_paid,payload.image_authorization,true,active_reservation_policy_id,now(),active_image_policy_id,payload.service_price,payload.reservation_amount,payload.remaining_amount,payload.payment_proof,payload.duration_minutes,payload.total_duration_minutes
  from jsonb_populate_record(null::public.appointments,appointment_data) payload returning * into created_appointment;
  insert into public.appointment_services(appointment_id,service_id,service_name,duration_minutes,service_price,reservation_amount)
  select created_appointment.id,p.service_id,p.service_name,p.duration_minutes,p.service_price,p.reservation_amount from jsonb_populate_recordset(null::public.appointment_services,services_data) p;
  return to_jsonb(created_appointment);
end $$;
