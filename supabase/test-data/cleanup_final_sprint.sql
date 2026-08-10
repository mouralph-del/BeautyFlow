-- LIMPEZA SEGURA DOS UUIDS RESERVADOS PARA A SPRINT FINAL.
-- Antes de executar, na mesma sessão: set beauty_studio.seed_mode = 'test';
do $$ begin
  if current_setting('beauty_studio.seed_mode', true) is distinct from 'test' then
    raise exception 'Limpeza bloqueada. Defina beauty_studio.seed_mode=test somente no ambiente de teste.';
  end if;
end $$;

delete from public.automation_email_outbox where recipient like '%@sprint.invalid' or event_key like '%f1000000-0000-4000-8000-0000000000%';
delete from public.email_delivery_logs where recipient like '%@sprint.invalid' or event_key like '%f1000000-0000-4000-8000-0000000000%';
delete from public.financial_transactions where id::text like 'f5000000-%' or idempotency_key like 'test-final:%';
delete from public.expenses where id = 'f6000000-0000-4000-8000-000000000001';
delete from public.promotions where id::text like 'f4000000-%';
delete from public.reschedule_requests where id = 'f3000000-0000-4000-8000-000000000001';
delete from public.booking_requests where id = 'f2000000-0000-4000-8000-000000000001';
delete from public.request_activity where request_id like 'f1000000-%' or request_id like 'f2000000-%' or request_id like 'f3000000-%';
delete from public.admin_notifications where appointment_id like 'f1000000-%';
delete from public.appointments where id::text like 'f1000000-%';
