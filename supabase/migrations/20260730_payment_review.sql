create or replace function public.review_appointment_payment(
  target_appointment_id text,
  payment_approved boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_role text;
  updated_appointment public.appointments%rowtype;
begin
  admin_role := coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );

  if admin_role <> 'admin' then
    raise exception 'Acesso restrito à administradora.';
  end if;

  update public.appointments
  set
    status = case
      when payment_approved then 'confirmado'
      else 'cancelado'
    end,
    payment_status = case
      when payment_approved then 'confirmado'
      else 'recusado'
    end,
    reservation_paid = payment_approved
  where id::text = target_appointment_id
    and payment_status = 'em_analise'
  returning * into updated_appointment;

  if not found then
    raise exception 'Agendamento não encontrado ou já analisado.';
  end if;

  return to_jsonb(updated_appointment);
end;
$$;

revoke all on function public.review_appointment_payment(text, boolean)
from public;

grant execute on function public.review_appointment_payment(text, boolean)
to authenticated;

drop policy if exists "Admins can view appointments"
on public.appointments;

create policy "Admins can view appointments"
on public.appointments
for select
to authenticated
using (
  coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
);

drop policy if exists "Admins can view appointment services"
on public.appointment_services;

create policy "Admins can view appointment services"
on public.appointment_services
for select
to authenticated
using (
  coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
);

drop policy if exists "Admins can view booking requests"
on public.booking_requests;

create policy "Admins can view booking requests"
on public.booking_requests
for select
to authenticated
using (
  coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
);

-- Permite que administradores autenticados visualizem comprovantes privados.
drop policy if exists "Admins can read payment proofs"
on storage.objects;

create policy "Admins can read payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
);
