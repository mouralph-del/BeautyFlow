-- Integra as configurações administrativas ao runtime público sem expor dados privados.

create or replace function public.admin_save_settings(section text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário';
  end if;

  if section = 'profile' then
    select public_data - 'site' into old from public.studio_settings where id = 'main';
    update public.studio_settings
       set public_data = (public_data - 'site') || (payload - 'site') ||
                         jsonb_build_object('site', coalesce(public_data->'site', '{}'::jsonb)),
           updated_by = auth.uid(), updated_at = now()
     where id = 'main';
  elsif section = 'site' then
    select public_data->'site' into old from public.studio_settings where id = 'main';
    update public.studio_settings
       set public_data = jsonb_set(public_data, '{site}', coalesce(public_data->'site', '{}'::jsonb) || payload, true),
           updated_by = auth.uid(), updated_at = now()
     where id = 'main';
  elsif section = 'payments' then
    select private_data into old from public.studio_settings where id = 'main';
    update public.studio_settings
       set private_data = private_data || payload, updated_by = auth.uid(), updated_at = now()
     where id = 'main';
  elsif section = 'schedule' then
    select settings into old from public.schedule_settings where id = 'default';
    update public.schedule_settings
       set settings = payload, updated_by = auth.uid(), updated_at = now()
     where id = 'default';
  else
    raise exception 'Seção inválida';
  end if;

  insert into public.system_settings_activity(section, action, previous_value, new_value, performed_by)
  values (
    section, 'updated',
    case when section = 'payments' then jsonb_build_object('masked', true) else old end,
    case when section = 'payments' then jsonb_build_object('masked', true) else payload end,
    auth.uid()
  );
end;
$$;

alter table public.appointments
  add column if not exists reservation_policy_version_id uuid
  references public.policy_versions(id) on delete restrict;

create or replace function public.create_appointment_with_services(
  appointment_data jsonb,
  services_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_appointment public.appointments%rowtype;
  active_reservation_policy_id uuid;
begin
  if appointment_data is null then
    raise exception 'appointment_data é obrigatório';
  end if;
  if services_data is null or jsonb_typeof(services_data) <> 'array' or jsonb_array_length(services_data) = 0 then
    raise exception 'services_data deve conter pelo menos um serviço';
  end if;
  if coalesce((appointment_data->>'reservation_policy_accepted')::boolean, false) is not true then
    raise exception 'É necessário aceitar a política de reserva para criar o agendamento';
  end if;

  select id into active_reservation_policy_id
    from public.policy_versions
   where policy_type = 'reservation' and is_active
   order by version desc limit 1;
  if active_reservation_policy_id is null then
    raise exception 'Não existe uma política de reserva ativa';
  end if;

  insert into public.appointments (
    customer_name, phone, email, notes, appointment_date, appointment_time,
    end_time, status, payment_status, reservation_paid, image_authorization,
    reservation_policy_accepted, reservation_policy_version_id, service_price,
    reservation_amount, remaining_amount, payment_proof, duration_minutes,
    total_duration_minutes
  )
  select payload.customer_name, payload.phone, payload.email, payload.notes,
    payload.appointment_date, payload.appointment_time, payload.end_time,
    payload.status, payload.payment_status, payload.reservation_paid,
    payload.image_authorization, true, active_reservation_policy_id,
    payload.service_price, payload.reservation_amount, payload.remaining_amount,
    payload.payment_proof, payload.duration_minutes, payload.total_duration_minutes
  from jsonb_populate_record(null::public.appointments, appointment_data) payload
  returning * into created_appointment;

  insert into public.appointment_services (
    appointment_id, service_id, service_name, duration_minutes, service_price, reservation_amount
  )
  select created_appointment.id, service_payload.service_id, service_payload.service_name,
    service_payload.duration_minutes, service_payload.service_price, service_payload.reservation_amount
  from jsonb_populate_recordset(null::public.appointment_services, services_data) service_payload;

  return to_jsonb(created_appointment);
end;
$$;

create or replace function public.get_public_day_availability(target_date date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'special_hours', (
      select jsonb_build_object(
        'opening', to_char(h.opening_time, 'HH24:MI'),
        'breakStart', case when h.break_start is null then null else to_char(h.break_start, 'HH24:MI') end,
        'breakEnd', case when h.break_end is null then null else to_char(h.break_end, 'HH24:MI') end,
        'closing', to_char(h.closing_time, 'HH24:MI')
      )
      from public.special_schedule_hours h
      where h.is_active and (h.special_date = target_date or h.weekday = extract(dow from target_date)::smallint)
      order by (h.special_date is not null) desc
      limit 1
    ),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'start', to_char(b.start_time, 'HH24:MI'),
        'end', to_char(b.end_time, 'HH24:MI')
      ) order by b.start_time)
      from public.agenda_blocks b where b.block_date = target_date
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_day_availability(date) from public;
grant execute on function public.get_public_day_availability(date) to anon, authenticated;
