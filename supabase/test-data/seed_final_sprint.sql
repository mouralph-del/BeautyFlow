-- DADOS FICTÍCIOS EXCLUSIVOS PARA DESENVOLVIMENTO/TESTE.
-- Antes de executar, na mesma sessão: set beauty_studio.seed_mode = 'test';
do $$ begin
  if current_setting('beauty_studio.seed_mode', true) is distinct from 'test' then
    raise exception 'Seed bloqueado. Defina beauty_studio.seed_mode=test somente em ambiente de teste.';
  end if;
end $$;

-- O domínio .invalid não recebe mensagens. Os UUIDs fixos tornam carga e limpeza idempotentes.
insert into public.appointments
  (id,service_name,customer_name,phone,email,notes,appointment_date,appointment_time,end_time,status,payment_status,reservation_paid,reservation_policy_accepted,service_price,reservation_amount,remaining_amount,duration_minutes,total_duration_minutes,cancelled_at,cancelled_by,reason)
values
  ('f1000000-0000-4000-8000-000000000001','Serviço fictício','[TESTE] Pagamento em análise','(00) 00000-0001','pagamento@sprint.invalid','[TESTE FINAL SPRINT] Remover após validação.',current_date+10,'09:00','10:00','aguardando_aprovacao','em_analise',false,true,120,30,90,60,60,null,null,null),
  ('f1000000-0000-4000-8000-000000000002','Serviço fictício','[TESTE] Remarcação','(00) 00000-0002','remarcacao@sprint.invalid','[TESTE FINAL SPRINT] Horário original preservado.',current_date+11,'10:00','11:00','confirmado','confirmado',true,true,150,30,120,60,60,null,null,null),
  ('f1000000-0000-4000-8000-000000000003','Serviço fictício','[TESTE] Cancelamento recente','(00) 00000-0003','cancelamento@sprint.invalid','[TESTE FINAL SPRINT] Cancelamento recente.',current_date+12,'11:00','12:00','cancelado','confirmado',true,true,100,25,75,60,60,now()-interval '1 hour','teste','Cancelamento fictício para validação'),
  ('f1000000-0000-4000-8000-000000000004','Serviço fictício','[TESTE] Pagamento total','(00) 00000-0004','financeiro-total@sprint.invalid','[TESTE FINAL SPRINT] Financeiro.',current_date-3,'13:30','14:30','concluido','confirmado',true,true,200,40,0,60,60,null,null,null),
  ('f1000000-0000-4000-8000-000000000005','Serviço fictício','[TESTE] Pagamento parcial','(00) 00000-0005','financeiro-parcial@sprint.invalid','[TESTE FINAL SPRINT] Financeiro.',current_date-2,'14:30','15:30','confirmado','confirmado',true,true,180,30,100,60,60,null,null,null),
  ('f1000000-0000-4000-8000-000000000006','Serviço fictício','[TESTE] Não comparecimento','(00) 00000-0006','financeiro-falta@sprint.invalid','[TESTE FINAL SPRINT] Financeiro.',current_date-1,'15:30','16:30','nao_compareceu','confirmado',true,true,140,30,110,60,60,null,null,null)
on conflict (id) do nothing;

insert into public.booking_requests
  (id,service_name,duration_minutes,total_duration_minutes,customer_name,phone,email,notes,appointment_date,appointment_time,status,total_price,reservation_amount,remaining_amount,services_data,preferred_period)
values
  ('f2000000-0000-4000-8000-000000000001','Serviço fictício',60,60,'[TESTE] Encaixe pendente','(00) 00000-0010','encaixe@sprint.invalid','[TESTE FINAL SPRINT] Solicitação removível.',current_date+14,'09:30','pendente',120,30,90,'[]'::jsonb,'manhã')
on conflict (id) do nothing;

insert into public.reschedule_requests
  (id,appointment_id,requested_date,requested_time,reason,status)
values
  ('f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002',current_date+18,'14:00','[TESTE FINAL SPRINT] Motivo fictício','pendente')
on conflict (id) do nothing;

insert into public.promotions
  (id,title,description,internal_name,short_description,full_description,discount_type,discount_value,status,active,starts_at,ends_at,highlight_home,highlight_customer_area,button_text,button_target,applies_to_all_services,email_enabled)
values
  ('f4000000-0000-4000-8000-000000000001','[TESTE] Promoção ativa','Oferta fictícia para validação.','[TESTE FINAL SPRINT] Ativa','Validação de preço promocional.','Registro fictício e removível.','percentage',10,'active',true,now()-interval '1 day',now()+interval '15 days',true,true,'Ver serviços','/servicos',true,false),
  ('f4000000-0000-4000-8000-000000000002','[TESTE] Promoção agendada','Oferta fictícia para validação.','[TESTE FINAL SPRINT] Agendada','Validação de estado agendado.','Registro fictício e removível.','fixed',15,'scheduled',false,now()+interval '5 days',now()+interval '20 days',false,false,'Ver serviços','/servicos',true,false),
  ('f4000000-0000-4000-8000-000000000003','[TESTE] Promoção pausada','Oferta fictícia para validação.','[TESTE FINAL SPRINT] Pausada','Validação de estado pausado.','Registro fictício e removível.','percentage',12,'paused',false,now()-interval '2 days',now()+interval '10 days',false,false,'Ver serviços','/servicos',true,false),
  ('f4000000-0000-4000-8000-000000000004','[TESTE] Promoção encerrada','Oferta fictícia para validação.','[TESTE FINAL SPRINT] Encerrada','Validação de histórico.','Registro fictício e removível.','percentage',8,'ended',false,now()-interval '20 days',now()-interval '2 days',false,false,'Ver serviços','/servicos',true,false)
on conflict (id) do nothing;

insert into public.financial_transactions
  (id,appointment_id,transaction_type,amount,gross_amount,machine_fee,net_amount,payment_method,payment_status,received_at,notes,idempotency_key)
values
  ('f5000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000004','reservation',40,40,0,40,'pix','received',now()-interval '3 days','[TESTE FINAL SPRINT] Taxa de reserva','test-final:reservation:4'),
  ('f5000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000004','remaining_payment',160,160,5,155,'credit_card','received',now()-interval '3 days','[TESTE FINAL SPRINT] Total com taxa de maquininha','test-final:total:4'),
  ('f5000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000005','reservation',30,30,0,30,'pix','received',now()-interval '2 days','[TESTE FINAL SPRINT] Reserva aprovada','test-final:reservation:5'),
  ('f5000000-0000-4000-8000-000000000004','f1000000-0000-4000-8000-000000000005','partial_payment',50,50,2,48,'debit_card','received',now()-interval '2 days','[TESTE FINAL SPRINT] Parcial com saldo','test-final:partial:5'),
  ('f5000000-0000-4000-8000-000000000005','f1000000-0000-4000-8000-000000000006','reservation',30,30,0,30,'pix','received',now()-interval '1 day','[TESTE FINAL SPRINT] Não comparecimento','test-final:reservation:6')
on conflict (id) do nothing;

insert into public.expenses
  (id,expense_date,description,category,amount,payment_method,notes)
values
  ('f6000000-0000-4000-8000-000000000001',current_date-1,'[TESTE] Material descartável','materials',35,'pix','[TESTE FINAL SPRINT] Despesa fictícia removível.')
on conflict (id) do nothing;
