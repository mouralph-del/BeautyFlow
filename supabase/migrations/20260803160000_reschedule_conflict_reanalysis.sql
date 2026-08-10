create or replace function public.customer_respond_reschedule_proposal(
  target_request_id uuid,
  accepted boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.reschedule_requests%rowtype;
  appt public.appointments%rowtype;
  duration integer;
  ending integer;
begin
  select * into req
  from public.reschedule_requests
  where id = target_request_id and customer_id = auth.uid()
  for update;

  if not found or req.status <> 'aguardando_resposta_cliente' then
    raise exception 'Esta proposta não está mais disponível';
  end if;

  select * into appt from public.appointments where id = req.appointment_id for update;

  if accepted then
    duration := coalesce(appt.total_duration_minutes, appt.duration_minutes);

    begin
      perform public.assert_appointment_slot_available(
        req.proposed_date,
        req.proposed_time,
        duration,
        appt.id
      );
    exception when others then
      update public.reschedule_requests
      set status = 'pendente',
          customer_response = null,
          customer_responded_at = now(),
          admin_message = 'O horário sugerido deixou de estar disponível. A solicitação voltou para análise.'
      where id = req.id
      returning * into req;

      insert into public.request_activity(
        request_type, request_id, action, description, performed_by
      ) values (
        'remarcacao', req.id::text, 'conflito_na_aceitacao',
        'O horário sugerido deixou de estar disponível e o pedido voltou para análise.',
        auth.uid()
      );

      insert into public.admin_notifications(appointment_id, type, title, message)
      values (
        appt.id::text,
        'reschedule_conflict',
        'Remarcação voltou para análise',
        appt.customer_name || ': o horário sugerido não está mais disponível.'
      );

      return jsonb_build_object(
        'success', false,
        'message', 'Este horário não está mais disponível. Sua solicitação voltou para análise.',
        'request', to_jsonb(req)
      );
    end;

    ending := split_part(req.proposed_time, ':', 1)::int * 60
      + split_part(req.proposed_time, ':', 2)::int + duration;

    update public.appointments
    set appointment_date = req.proposed_date,
        appointment_time = left(req.proposed_time, 5),
        end_time = lpad((ending / 60)::text, 2, '0') || ':' || lpad((ending % 60)::text, 2, '0')
    where id = appt.id;

    update public.reschedule_requests
    set status = 'aprovado', customer_response = 'aceita', customer_responded_at = now()
    where id = req.id returning * into req;
  else
    update public.reschedule_requests
    set status = 'proposta_recusada', customer_response = 'recusada', customer_responded_at = now()
    where id = req.id returning * into req;

    insert into public.admin_notifications(appointment_id, type, title, message)
    values (appt.id::text, 'reschedule_proposal_rejected', 'Proposta de horário não aceita', appt.customer_name);
  end if;

  insert into public.request_activity(request_type, request_id, action, description, performed_by)
  values (
    'remarcacao', req.id::text,
    case when accepted then 'proposta_aceita' else 'proposta_recusada' end,
    null, auth.uid()
  );

  return jsonb_build_object('success', true, 'request', to_jsonb(req));
end $$;

revoke all on function public.customer_respond_reschedule_proposal(uuid, boolean) from public;
grant execute on function public.customer_respond_reschedule_proposal(uuid, boolean) to authenticated;
