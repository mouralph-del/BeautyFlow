alter table public.appointments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.appointments
  alter column user_id set default auth.uid();

create index if not exists appointments_user_id_idx
  on public.appointments (user_id);

update public.appointments as appointment
set user_id = matched_user.id
from auth.users as matched_user
where appointment.user_id is null
  and appointment.email is not null
  and lower(trim(appointment.email)) = lower(trim(matched_user.email));

create or replace function public.get_customer_space()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id uuid;
  customer_email text;
  customer_appointments jsonb;
  active_promotion jsonb;
begin
  authenticated_user_id := auth.uid();
  customer_email := lower(trim(auth.jwt() ->> 'email'));

  if authenticated_user_id is null then
    raise exception 'É necessário estar autenticada para acessar esta área';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', appointment.id,
        'serviceName', appointment.service_name,
        'date', appointment.appointment_date,
        'time', to_char(appointment.appointment_time::time, 'HH24:MI'),
        'value', appointment.service_price,
        'status', appointment.status,
        'services', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', appointment_service.service_id,
                'name', appointment_service.service_name,
                'durationMinutes', appointment_service.duration_minutes,
                'price', appointment_service.service_price
              )
              order by appointment_service.id
            )
            from public.appointment_services as appointment_service
            where appointment_service.appointment_id = appointment.id
          ),
          '[]'::jsonb
        )
      )
      order by appointment.appointment_date desc,
        appointment.appointment_time desc
    ),
    '[]'::jsonb
  )
  into customer_appointments
  from public.appointments as appointment
  where appointment.user_id = authenticated_user_id
    or (
      appointment.user_id is null
      and customer_email is not null
      and lower(trim(appointment.email)) = customer_email
    );

  select jsonb_build_object(
    'id', promotion.id,
    'title', promotion.title,
    'description', promotion.description,
    'link', promotion.link
  )
  into active_promotion
  from public.promotions as promotion
  where promotion.active is true
    and (promotion.starts_at is null or promotion.starts_at <= now())
    and (promotion.ends_at is null or promotion.ends_at >= now())
  order by promotion.created_at desc
  limit 1;

  return jsonb_build_object(
    'appointments', customer_appointments,
    'promotion', active_promotion
  );
end;
$$;

revoke all on function public.get_customer_space() from public;
grant execute on function public.get_customer_space() to authenticated;
