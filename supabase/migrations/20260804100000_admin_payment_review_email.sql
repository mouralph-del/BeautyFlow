-- Avisa a administração quando um agendamento normal entra em análise.
-- O destinatário real é resolvido no servidor por THAIS_ADMIN_EMAIL.
alter table public.email_templates add column if not exists subtitle text not null default '';
alter table public.email_templates add column if not exists button_text text not null default '';
alter table public.email_templates add column if not exists button_url text not null default '';

create or replace function public.admin_save_email_template(payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare required text;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  for required in select unnest(required_variables) from public.email_templates where id=payload->>'id' loop
    if position(required in concat(payload->>'body', payload->>'button_url'))=0 then raise exception 'A variável obrigatória % não pode ser removida', required; end if;
  end loop;
  update public.email_templates set subject=payload->>'subject', title=payload->>'title', subtitle=coalesce(payload->>'subtitle',''), body=payload->>'body', signature=payload->>'signature', button_text=coalesce(payload->>'button_text',''), button_url=coalesce(payload->>'button_url',''), updated_by=auth.uid(), updated_at=now() where id=payload->>'id';
  insert into public.system_settings_activity(section,action,new_value,performed_by) values('emails','template_updated',jsonb_build_object('id',payload->>'id'),auth.uid());
end $$;

insert into public.notification_preferences (id, email_enabled, priority)
values ('admin_payment_review', true, 'high')
on conflict (id) do nothing;

insert into public.email_templates (id, subject, title, subtitle, body, signature, button_text, button_url, required_variables)
values (
  'admin_payment_review',
  'Novo pagamento aguardando análise',
  'Pagamento aguardando análise',
  'Uma cliente enviou um comprovante e aguarda sua análise.',
  '<p><strong>Cliente:</strong> {{customer_name}}<br><strong>E-mail:</strong> {{customer_email}}<br><strong>Telefone:</strong> {{customer_phone}}<br><strong>Serviços:</strong> {{service_name}}<br><strong>Data:</strong> {{appointment_date}}<br><strong>Horário:</strong> {{appointment_time}}<br><strong>Taxa de reserva:</strong> R$ {{reservation_amount}}<br><strong>Enviado em:</strong> {{submitted_at}}</p>',
  'Thaís Santos Beauty Studio<br>Cuidando da sua beleza com carinho. 🤎',
  'Analisar pagamento',
  '{{site_url}}/admin/solicitacoes?tab=pagamentos',
  array['{{customer_name}}','{{customer_email}}','{{customer_phone}}','{{service_name}}','{{appointment_date}}','{{appointment_time}}','{{reservation_amount}}','{{submitted_at}}','{{site_url}}']
)
on conflict (id) do update set
  subject = excluded.subject, title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  button_text = excluded.button_text, button_url = excluded.button_url,
  signature = excluded.signature, required_variables = excluded.required_variables,
  updated_at = now();

create or replace function public.automation_appointment_email_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare vars jsonb; names text;
begin
  select coalesce(string_agg(service_name, ', '), new.service_name, 'Atendimento')
    into names from public.appointment_services where appointment_id = new.id;
  vars := jsonb_build_object(
    'customer_name', new.customer_name,
    'appointment_date', to_char(new.appointment_date, 'DD/MM/YYYY'),
    'appointment_time', left(new.appointment_time, 5),
    'service_name', names,
    'reservation_amount', to_char(coalesce(new.reservation_amount, 0), 'FM999999990D00'),
    'customer_email', new.email,
    'customer_phone', new.phone,
    'submitted_at', to_char(coalesce(new.created_at, now()), 'DD/MM/YYYY HH24:MI'),
    'request_id', new.id
  );
  if tg_op = 'INSERT' and new.payment_status = 'em_analise' then
    perform public.enqueue_automation_email(new.email, 'payment_review', 'payment_analysis', 'payment-review:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    perform public.enqueue_automation_email('admin@invalid.local', 'admin_payment_review', 'admin_payment_review', 'admin-payment-review:' || new.id, vars, jsonb_build_object('appointment_id', new.id, 'requires_admin_email', true));
    insert into public.admin_notifications (appointment_id, type, title, message)
    values (new.id::text, 'payment_review', 'Novo pagamento para análise', new.customer_name);
  end if;
  if tg_op = 'UPDATE' and new.payment_status is distinct from old.payment_status then
    if new.payment_status in ('aprovado','pago','approved','confirmado') then
      perform public.enqueue_automation_email(new.email, 'payment_confirmed', 'payment_proof', 'payment-approved:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
    if new.payment_status in ('recusado','refused','rejeitado') then
      perform public.enqueue_automation_email(new.email, 'payment_refused', 'payment_refused', 'payment-rejected:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('confirmado','confirmed') then
      perform public.enqueue_automation_email(new.email, 'appointment_confirmed', 'appointment_confirmed', 'appointment-confirmed:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
    if new.status = 'cancelado' then
      perform public.enqueue_automation_email(new.email, 'cancellation', 'cancellation', 'appointment-cancelled:' || new.id, vars, jsonb_build_object('appointment_id', new.id));
    end if;
  end if;
  return new;
end $$;

-- A revisão administrativa usa "confirmado"; mantém a reserva financeira idempotente.
create or replace function public.sync_reservation_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reservation_paid = true
     and coalesce(new.payment_status, '') in ('aprovado','pago','approved','confirmado') then
    insert into public.financial_transactions (
      appointment_id, customer_id, transaction_type, amount, gross_amount,
      net_amount, payment_method, payment_status, received_at, notes, idempotency_key
    ) values (
      new.id, new.user_id, 'reservation', coalesce(new.reservation_amount, 0),
      coalesce(new.reservation_amount, 0), coalesce(new.reservation_amount, 0),
      'pix', 'received', now(), 'Taxa de reserva aprovada', 'reservation:' || new.id
    ) on conflict (idempotency_key) do nothing;
  end if;
  return new;
end $$;
