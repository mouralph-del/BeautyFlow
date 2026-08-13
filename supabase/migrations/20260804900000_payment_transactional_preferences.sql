-- Separa comunicações transacionais da cliente dos avisos administrativos.
insert into public.notification_preferences(id, email_enabled, priority)
values
  ('payment_confirmed', true, 'high'),
  ('payment_refused', true, 'high')
on conflict(id) do update
set email_enabled = excluded.email_enabled,
    priority = excluded.priority;

create or replace function public.automation_appointment_email_trigger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  vars jsonb;
  names text;
  payment_changed boolean := false;
begin
  select coalesce(string_agg(service_name,', '),new.service_name,'Atendimento')
    into names from public.appointment_services where appointment_id=new.id;
  vars:=jsonb_build_object(
    'customer_name',new.customer_name,
    'appointment_date',to_char(new.appointment_date,'DD/MM/YYYY'),
    'appointment_time',left(new.appointment_time,5),
    'service_name',names,
    'reservation_amount',to_char(coalesce(new.reservation_amount,0),'FM999999990D00'),
    'customer_email',new.email,
    'customer_phone',new.phone,
    'submitted_at',to_char(coalesce(new.created_at,now()),'DD/MM/YYYY HH24:MI'),
    'request_id',new.id
  );

  if tg_op='INSERT' and new.payment_status='em_analise' then
    perform public.enqueue_automation_email(new.email,'payment_review','payment_analysis','payment-review:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    perform public.enqueue_automation_email('admin@invalid.local','admin_payment_review','admin_payment_review','admin-payment-review:'||new.id,vars,jsonb_build_object('appointment_id',new.id,'requires_admin_email',true));
    insert into public.admin_notifications(appointment_id,type,title,message)
    values(new.id::text,'payment_review','Novo pagamento para análise',new.customer_name);
  end if;

  if tg_op='UPDATE' and new.payment_status is distinct from old.payment_status then
    if new.payment_status in('aprovado','pago','approved','confirmado') then
      payment_changed:=true;
      perform public.enqueue_automation_email(new.email,'payment_confirmed','payment_confirmed','payment-approved:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    elsif new.payment_status in('recusado','refused','rejeitado') then
      payment_changed:=true;
      perform public.enqueue_automation_email(new.email,'payment_refused','payment_refused','payment-rejected:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    end if;
  end if;

  if tg_op='UPDATE' and new.status is distinct from old.status and not payment_changed then
    if new.status in('confirmado','confirmed') then
      perform public.enqueue_automation_email(new.email,'appointment_confirmed','appointment_confirmed','appointment-confirmed:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    elsif new.status='cancelado' then
      perform public.enqueue_automation_email(new.email,'cancellation','cancellation','appointment-cancelled:'||new.id,vars,jsonb_build_object('appointment_id',new.id));
    end if;
  end if;
  return new;
end;
$$;
