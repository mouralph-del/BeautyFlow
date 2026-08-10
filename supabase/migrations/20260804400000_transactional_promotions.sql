-- O navegador apenas indica a promoção desejada. Esta função bloqueia e valida
-- promoção/serviços e persiste os valores efetivos em uma única transação.
create or replace function public.create_appointment_with_services(appointment_data jsonb, services_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  created_appointment public.appointments%rowtype;
  selected_promotion public.promotions%rowtype;
  active_reservation_policy_id uuid;
  active_image_policy_id uuid;
  effective_email text;
  requested_promotion_id uuid;
  service_count integer;
  original_total numeric(10,2);
  original_reservation numeric(10,2);
  final_total numeric(10,2);
  final_reservation numeric(10,2);
  discount_total numeric(10,2);
begin
  if appointment_data is null then raise exception 'appointment_data é obrigatório'; end if;
  if services_data is null or jsonb_typeof(services_data) <> 'array' or jsonb_array_length(services_data) = 0 then
    raise exception 'services_data deve conter pelo menos um serviço';
  end if;
  if coalesce((appointment_data->>'reservation_policy_accepted')::boolean, false) is not true then
    raise exception 'É necessário aceitar a política de reserva para criar o agendamento';
  end if;

  select count(distinct requested.catalog_service_id),
         round(sum(catalog.price), 2),
         round(sum(catalog.reservation_amount), 2)
    into service_count, original_total, original_reservation
  from jsonb_to_recordset(services_data) as requested(catalog_service_id bigint)
  join public.services catalog on catalog.id = requested.catalog_service_id and catalog.is_active;

  if service_count <> jsonb_array_length(services_data) then
    raise exception 'Há serviço inexistente, inativo ou duplicado no agendamento';
  end if;

  requested_promotion_id := nullif(appointment_data->>'promotion_id', '')::uuid;
  final_total := original_total;
  final_reservation := original_reservation;

  if requested_promotion_id is not null then
    select * into selected_promotion
    from public.promotions
    where id = requested_promotion_id
    for update;

    if not found or selected_promotion.status <> 'active'
       or coalesce(selected_promotion.starts_at, now()) > now()
       or coalesce(selected_promotion.ends_at, now() + interval '100 years') < now() then
      raise exception 'Promoção indisponível';
    end if;
    if selected_promotion.usage_limit is not null and selected_promotion.usage_count >= selected_promotion.usage_limit then
      raise exception 'Promoção esgotada';
    end if;
    if not selected_promotion.applies_to_all_services and exists (
      select 1
      from jsonb_to_recordset(services_data) as requested(catalog_service_id bigint)
      where not exists (
        select 1 from public.promotion_services allowed
        where allowed.promotion_id = selected_promotion.id
          and allowed.service_id = requested.catalog_service_id
      )
    ) then
      raise exception 'Promoção não aplicável a todos os serviços selecionados';
    end if;

    final_total := case selected_promotion.discount_type
      when 'percentage' then original_total * (1 - coalesce(selected_promotion.discount_value, 0) / 100)
      when 'fixed' then original_total - coalesce(selected_promotion.discount_value, 0)
      when 'promotional_price' then coalesce(selected_promotion.promotional_price, original_total)
      else original_total
    end;
    final_total := round(greatest(0, least(original_total, final_total)), 2);

    if selected_promotion.apply_to_reservation_fee and original_total > 0 then
      final_reservation := round(original_reservation * final_total / original_total, 2);
    end if;
    final_reservation := greatest(0, least(final_total, final_reservation));
  end if;
  discount_total := original_total - final_total;

  select id into active_reservation_policy_id from public.policy_versions where policy_type='reservation' and is_active order by version desc limit 1;
  select id into active_image_policy_id from public.policy_versions where policy_type='image_authorization' and is_active order by version desc limit 1;
  if active_reservation_policy_id is null then raise exception 'Não existe uma política de reserva ativa'; end if;
  effective_email := case when auth.uid() is null then lower(trim(appointment_data->>'email')) else lower(trim(auth.jwt()->>'email')) end;

  insert into public.appointments(
    customer_name,phone,email,user_id,notes,appointment_date,appointment_time,end_time,status,payment_status,
    reservation_paid,image_authorization,reservation_policy_accepted,reservation_policy_version_id,
    reservation_policy_accepted_at,image_authorization_policy_version_id,service_price,reservation_amount,
    remaining_amount,payment_proof,duration_minutes,total_duration_minutes,promotion_id,original_service_price,promotion_discount
  )
  select payload.customer_name,payload.phone,effective_email,auth.uid(),payload.notes,payload.appointment_date,payload.appointment_time,
    payload.end_time,payload.status,payload.payment_status,payload.reservation_paid,payload.image_authorization,true,
    active_reservation_policy_id,now(),active_image_policy_id,final_total,final_reservation,final_total-final_reservation,
    payload.payment_proof,(select sum(s.duration_minutes) from jsonb_to_recordset(services_data) r(catalog_service_id bigint) join public.services s on s.id=r.catalog_service_id),
    (select sum(s.duration_minutes) from jsonb_to_recordset(services_data) r(catalog_service_id bigint) join public.services s on s.id=r.catalog_service_id),
    requested_promotion_id,original_total,discount_total
  from jsonb_populate_record(null::public.appointments, appointment_data) payload
  returning * into created_appointment;

  with priced_services as (
    select catalog.*,
      row_number() over(order by catalog.id) as line_number,
      count(*) over() as line_count,
      case when original_total=0 then 0 else round(catalog.price * final_total / original_total,2) end as allocated_price,
      case when original_reservation=0 then 0 else round(catalog.reservation_amount * final_reservation / original_reservation,2) end as allocated_reservation
    from jsonb_to_recordset(services_data) requested(catalog_service_id bigint)
    join public.services catalog on catalog.id=requested.catalog_service_id
  ), balanced_services as (
    select priced_services.*,
      case when line_number=line_count then final_total-(sum(allocated_price) over()-allocated_price) else allocated_price end as balanced_price,
      case when line_number=line_count then final_reservation-(sum(allocated_reservation) over()-allocated_reservation) else allocated_reservation end as balanced_reservation
    from priced_services
  )
  insert into public.appointment_services(
    appointment_id,service_id,service_name,duration_minutes,service_price,reservation_amount,
    promotion_id,original_service_price,promotion_discount
  )
  select created_appointment.id,coalesce(legacy_id,id::integer),name,duration_minutes,
    balanced_price,balanced_reservation,requested_promotion_id,price,price-balanced_price
  from balanced_services;

  if requested_promotion_id is not null then
    update public.promotions set usage_count=usage_count+1,updated_at=now() where id=requested_promotion_id;
    insert into public.promotion_activity(promotion_id,action,performed_by,details)
    values(requested_promotion_id,'redeemed',auth.uid(),jsonb_build_object('appointment_id',created_appointment.id));
  end if;
  return to_jsonb(created_appointment);
end;
$$;

revoke all on function public.create_appointment_with_services(jsonb,jsonb) from public;
grant execute on function public.create_appointment_with_services(jsonb,jsonb) to anon,authenticated;

-- A agenda mensal já é chamada pelo executor Edge configurado em 20260803240000.
-- Remove somente o job legado equivalente, caso ambos coexistam.
do $$
declare legacy_job_id bigint;
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron')
     and exists(select 1 from cron.job where jobname='beautyflow-monthly-schedule-email-executor') then
    for legacy_job_id in select jobid from cron.job where jobname='monthly-schedule-release-reminders' loop
      perform cron.unschedule(legacy_job_id);
    end loop;
  end if;
exception when others then
  raise notice 'O job mensal legado não pôde ser removido: %',sqlerrm;
end $$;
