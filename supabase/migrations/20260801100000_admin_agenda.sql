create table if not exists public.agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason_type text not null check (reason_type in ('compromisso', 'curso', 'ferias', 'manutencao', 'outro')),
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint agenda_blocks_valid_time check (end_time > start_time)
);

create index if not exists agenda_blocks_date_idx on public.agenda_blocks(block_date);

create table if not exists public.special_schedule_hours (
  id uuid primary key default gen_random_uuid(),
  special_date date,
  weekday smallint check (weekday between 0 and 6),
  opening_time time not null,
  break_start time,
  break_end time,
  closing_time time not null,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint special_hours_target check ((special_date is not null) <> (weekday is not null)),
  constraint special_hours_valid check (closing_time > opening_time)
);

create unique index if not exists special_schedule_date_unique
  on public.special_schedule_hours(special_date) where special_date is not null;
create unique index if not exists special_schedule_weekday_unique
  on public.special_schedule_hours(weekday) where weekday is not null;

alter table public.agenda_blocks enable row level security;
alter table public.special_schedule_hours enable row level security;

drop policy if exists "Admins manage agenda blocks" on public.agenda_blocks;
create policy "Admins manage agenda blocks" on public.agenda_blocks
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins manage special schedule hours" on public.special_schedule_hours;
create policy "Admins manage special schedule hours" on public.special_schedule_hours
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.admin_create_manual_appointment(payload jsonb, services_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Acesso administrativo necessário';
  end if;

  insert into public.appointments (
    customer_name, phone, email, notes, appointment_date, appointment_time,
    end_time, status, payment_status, reservation_paid, image_authorization,
    service_price, reservation_amount, remaining_amount, duration_minutes,
    total_duration_minutes, user_id
  ) values (
    payload->>'customer_name', payload->>'phone', payload->>'email', nullif(payload->>'notes', ''),
    (payload->>'appointment_date')::date, payload->>'appointment_time', payload->>'end_time',
    coalesce(payload->>'status', 'confirmado'), coalesce(payload->>'payment_status', 'pago'),
    coalesce((payload->>'reservation_paid')::boolean, true),
    nullif(payload->>'image_authorization', '')::boolean,
    (payload->>'service_price')::numeric, (payload->>'reservation_amount')::numeric,
    (payload->>'remaining_amount')::numeric, (payload->>'duration_minutes')::integer,
    (payload->>'total_duration_minutes')::integer, nullif(payload->>'user_id', '')::uuid
  ) returning id into new_id;

  insert into public.appointment_services (
    appointment_id, service_id, service_name, duration_minutes, service_price, reservation_amount
  )
  select new_id, nullif(item->>'service_id', '')::bigint, item->>'service_name',
    (item->>'duration_minutes')::integer, (item->>'service_price')::numeric,
    (item->>'reservation_amount')::numeric
  from jsonb_array_elements(services_payload) item;

  return new_id;
end;
$$;

revoke all on function public.admin_create_manual_appointment(jsonb, jsonb) from public;
grant execute on function public.admin_create_manual_appointment(jsonb, jsonb) to authenticated;
