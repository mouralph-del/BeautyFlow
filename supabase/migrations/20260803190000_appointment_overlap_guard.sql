create or replace function public.guard_appointment_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  starting integer;
  ending integer;
begin
  if new.status = 'cancelado' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.appointment_date::text, 0));
  starting := split_part(new.appointment_time, ':', 1)::integer * 60
    + split_part(new.appointment_time, ':', 2)::integer;
  ending := split_part(coalesce(new.end_time, new.appointment_time), ':', 1)::integer * 60
    + split_part(coalesce(new.end_time, new.appointment_time), ':', 2)::integer;
  if exists(
    select 1 from public.appointments a
    where a.id is distinct from new.id
      and a.appointment_date = new.appointment_date
      and a.status <> 'cancelado'
      and starting < split_part(coalesce(a.end_time,a.appointment_time),':',1)::integer*60 + split_part(coalesce(a.end_time,a.appointment_time),':',2)::integer
      and ending > split_part(a.appointment_time,':',1)::integer*60 + split_part(a.appointment_time,':',2)::integer
  ) then
    raise exception 'Este horário não está mais disponível';
  end if;
  return new;
end $$;

drop trigger if exists appointments_overlap_guard on public.appointments;
create trigger appointments_overlap_guard
before insert or update of appointment_date, appointment_time, end_time, status
on public.appointments
for each row execute function public.guard_appointment_overlap();

revoke all on function public.guard_appointment_overlap() from public;
