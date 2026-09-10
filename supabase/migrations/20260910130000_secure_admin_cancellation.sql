-- Cancelamento administrativo seguro, auditável e transacional.

alter table public.appointments
  add column if not exists cancelled_by_user_id uuid
  references auth.users(id) on delete set null;

create index if not exists appointments_cancelled_by_user_id_idx
  on public.appointments (cancelled_by_user_id)
  where cancelled_by_user_id is not null;

create or replace function public.cancel_admin_appointment(
  target_appointment_id uuid,
  cancellation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.appointments%rowtype;
  normalized_reason text := nullif(btrim(cancellation_reason), '');
  cancellation_time timestamptz := now();
  service_names text;
begin
  if not public.is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  if auth.uid() is null then
    raise exception 'Sessão administrativa inválida.';
  end if;

  if normalized_reason is null then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  select * into appointment_record
  from public.appointments
  where id = target_appointment_id
  for update;

  if not found then
    raise exception 'Agendamento não encontrado.';
  end if;

  if appointment_record.status = 'cancelado' then
    raise exception 'Este agendamento já foi cancelado e não pode ser alterado novamente.';
  end if;

  if appointment_record.status in ('concluido', 'nao_compareceu') then
    raise exception 'Este atendimento já foi finalizado e não pode ser cancelado.';
  end if;

  if (appointment_record.appointment_date + appointment_record.appointment_time::time)
    at time zone 'America/Sao_Paulo' <= now() then
    raise exception 'Este atendimento já começou e não pode ser cancelado.';
  end if;

  if appointment_record.payment_status = 'em_analise' then
    raise exception 'O pagamento deste agendamento está em análise. Analise o pagamento antes de cancelar o atendimento.';
  end if;

  update public.appointments
  set status = 'cancelado',
      cancelled_by = 'admin',
      cancelled_by_user_id = auth.uid(),
      cancelled_at = cancellation_time,
      reason = normalized_reason
  where id = appointment_record.id;

  select coalesce(string_agg(service_name, ', ' order by service_name), appointment_record.service_name, 'Atendimento')
  into service_names
  from public.appointment_services
  where appointment_id = appointment_record.id;

  return jsonb_build_object(
    'id', appointment_record.id,
    'status', 'cancelado',
    'cancelled_at', cancellation_time,
    'cancelled_by', 'admin',
    'cancelled_by_user_id', auth.uid(),
    'reason', normalized_reason,
    'service_name', service_names
  );
end;
$$;

revoke all on function public.cancel_admin_appointment(uuid, text) from public;
grant execute on function public.cancel_admin_appointment(uuid, text) to authenticated;

update public.email_templates
set body = '<p>Olá {{customer_name}}, o atendimento de {{service_name}} foi cancelado.</p><p><strong>Data e horário:</strong> {{appointment_date}} às {{appointment_time}}</p><p><strong>Motivo informado:</strong> {{cancellation_reason}}</p>',
    required_variables = array['{{customer_name}}', '{{service_name}}', '{{appointment_date}}', '{{appointment_time}}', '{{cancellation_reason}}'],
    updated_at = now()
where id = 'cancellation';

create or replace function public.automation_appointment_email_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vars jsonb;
  names text;
  payment_changed boolean := false;
begin
  select coalesce(string_agg(service_name, ', '), new.service_name, 'Atendimento') into names
  from public.appointment_services where appointment_id = new.id;

  vars := jsonb_build_object(
    'customer_name', new.customer_name,
    'appointment_date', to_char(new.appointment_date, 'DD/MM/YYYY'),
    'appointment_time', left(new.appointment_time, 5),
    'service_name', names,
    'reservation_amount', to_char(coalesce(new.reservation_amount, 0), 'FM999999990D00'),
    'customer_email', new.email,
    'customer_phone', new.phone,
    'submitted_at', to_char(coalesce(new.created_at, now()), 'DD/MM/YYYY HH24:MI'),
    'request_id', new.id,
    'cancellation_reason', coalesce(nullif(btrim(new.reason), ''), 'Não informado.')
  );

  if tg_op = 'INSERT' and new.payment_status = 'em_analise' then
    perform public.enqueue_automation_email(new.email, 'payment_review', 'payment_analysis', 'payment-review:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    perform public.enqueue_automation_email('admin@invalid.local', 'admin_payment_review', 'admin_payment_review', 'admin-payment-review:' || new.id, vars, jsonb_build_object('appointment_id', new.id, 'requires_admin_email', true));
    insert into public.admin_notifications(appointment_id, type, title, message) values(new.id::text, 'payment_review', 'Novo pagamento para análise', new.customer_name);
  end if;

  if tg_op = 'UPDATE' and new.payment_status is distinct from old.payment_status then
    if new.payment_status in ('aprovado', 'pago', 'approved', 'confirmado') then
      payment_changed := true;
      perform public.enqueue_automation_email(new.email, 'payment_confirmed', 'payment_confirmed', 'payment-approved:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    elsif new.payment_status in ('recusado', 'refused', 'rejeitado') then
      payment_changed := true;
      perform public.enqueue_automation_email(new.email, 'payment_refused', 'payment_refused', 'payment-rejected:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status and not payment_changed then
    if new.status in ('confirmado', 'confirmed') then
      perform public.enqueue_automation_email(new.email, 'appointment_confirmed', 'appointment_confirmed', 'appointment-confirmed:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    elsif new.status = 'cancelado' then
      perform public.enqueue_automation_email(new.email, 'cancellation', 'cancellation', 'appointment-cancelled:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_admin_domain_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text;
  category_value text;
  title_value text;
  message_value text;
  url_value text;
begin
  if tg_table_name = 'appointments' then
    if tg_op = 'INSERT' then
      key := 'appointment-created:' || new.id; category_value := 'agendamento'; title_value := 'Novo agendamento'; message_value := new.customer_name; url_value := '/admin/agenda?date=' || new.appointment_date;
    elsif new.payment_status is distinct from old.payment_status and new.payment_status in ('confirmado', 'recusado') then
      key := 'payment-status:' || new.id || ':' || new.payment_status; category_value := 'pagamento'; title_value := case when new.payment_status = 'confirmado' then 'Pagamento aprovado' else 'Pagamento recusado' end; message_value := new.customer_name; url_value := '/admin/solicitacoes?tab=pagamentos&request=' || new.id;
    elsif new.status is distinct from old.status and new.status = 'cancelado' then
      key := 'appointment-cancelled:' || new.id; category_value := 'cancelamento'; title_value := 'Um horário foi cancelado'; message_value := new.customer_name; url_value := '/admin/solicitacoes?tab=cancelamentos&request=' || new.id;
      if coalesce(new.cancelled_by, '') <> 'admin' then
        perform public.enqueue_automation_email('admin@invalid.local', 'admin_cancellation', 'admin_cancellation', 'admin-cancellation:' || new.id, jsonb_build_object('customer_name', new.customer_name, 'appointment_date', to_char(new.appointment_date, 'DD/MM/YYYY'), 'appointment_time', left(new.appointment_time, 5), 'request_id', new.id), jsonb_build_object('requires_admin_email', true, 'appointment_id', new.id));
      end if;
      if coalesce(new.cancelled_by, '') in ('cliente_area', 'cliente_link_email') then return new; end if;
    else
      return new;
    end if;
  elsif tg_table_name = 'booking_requests' then
    key := 'fit:' || new.id || ':' || new.status; category_value := 'encaixe'; title_value := case when tg_op = 'INSERT' then 'Novo pedido de encaixe' when new.status = 'expirado' then 'Proposta de encaixe expirada' else 'Encaixe atualizado' end; message_value := new.customer_name; url_value := '/admin/solicitacoes?tab=encaixes&request=' || new.id;
    if tg_op = 'INSERT' then perform public.enqueue_automation_email('admin@invalid.local', 'admin_fit', 'admin_fit', 'admin-fit:' || new.id, jsonb_build_object('customer_name', new.customer_name, 'request_id', new.id), jsonb_build_object('requires_admin_email', true)); end if;
  else
    key := 'reschedule:' || new.id || ':' || new.status; category_value := 'remarcação'; title_value := case when tg_op = 'INSERT' then 'Novo pedido de remarcação' else 'Remarcação atualizada' end; message_value := coalesce((select customer_name from public.appointments where id = new.appointment_id), 'Cliente'); url_value := '/admin/solicitacoes?tab=remarcacoes&request=' || new.id;
    if tg_op = 'INSERT' then perform public.enqueue_automation_email('admin@invalid.local', 'admin_reschedule', 'admin_reschedule', 'admin-reschedule:' || new.id, jsonb_build_object('customer_name', message_value, 'request_id', new.id), jsonb_build_object('requires_admin_email', true)); end if;
  end if;
  insert into public.admin_notifications(appointment_id, type, title, message, category, action_url, event_key)
  values(coalesce(new.id::text, null), category_value, title_value, message_value, category_value, url_value, key)
  on conflict(event_key) where event_key is not null do nothing;
  return new;
end;
$$;
