-- Limpeza opcional. Não executar antes da análise do resultado.
-- Na mesma sessão, defina um identificador exclusivo usado nas observações:
-- set beauty_studio.pix_test_run_id = '<IDENTIFICADOR-DO-TESTE>';
do $$
declare run_id text := current_setting('beauty_studio.pix_test_run_id', true);
begin
  if run_id is null or run_id !~ '^PIXTEST-[A-Z0-9-]{8,40}$' then
    raise exception 'Identificador de teste ausente ou inválido.';
  end if;
  if not exists (
    select 1 from public.appointments
    where customer_name = 'Cliente Teste Pix'
      and notes = '[TESTE PIX CONTROLADO:' || run_id || ']'
  ) then
    raise exception 'Nenhum agendamento corresponde exatamente ao teste informado.';
  end if;
end $$;

begin;
create temporary table pix_test_targets on commit drop as
select id, payment_proof
from public.appointments
where customer_name = 'Cliente Teste Pix'
  and notes = '[TESTE PIX CONTROLADO:' || current_setting('beauty_studio.pix_test_run_id') || ']';

-- Remova antes o arquivo payment_proof pelo Storage API autenticado como admin.
-- O script interrompe se o objeto ainda estiver presente no bucket privado.
do $$ begin
  if exists (
    select 1 from pix_test_targets t
    join storage.objects o on o.bucket_id = 'payment-proofs' and o.name = t.payment_proof
  ) then
    raise exception 'Remova primeiro o comprovante pelo Storage administrativo.';
  end if;
end $$;

delete from public.automation_email_outbox where metadata->>'appointment_id' in (select id::text from pix_test_targets);
delete from public.email_delivery_logs l
where exists (select 1 from pix_test_targets t where l.event_key like '%' || t.id::text);
delete from public.request_activity where request_id in (select id::text from pix_test_targets);
delete from public.admin_notifications where appointment_id in (select id::text from pix_test_targets);
delete from public.financial_transactions where appointment_id in (select id from pix_test_targets);
delete from public.appointments where id in (select id from pix_test_targets);
commit;
