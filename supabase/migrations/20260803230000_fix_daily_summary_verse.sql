create or replace function public.prepare_daily_summary_email(admin_email text) returns void language plpgsql security definer set search_path=public as $$
declare d date:=(now() at time zone 'America/Sao_Paulo')::date; verse text; previous text; configured jsonb; hour_value integer:=extract(hour from now() at time zone 'America/Sao_Paulo');
begin
  select history.verse into previous from public.daily_content_history as history order by history.local_date desc limit 1;
  select private_data->'daily_verses' into configured from public.studio_settings where id='main';
  if jsonb_typeof(configured)='array' and jsonb_array_length(configured)>0 then select value#>>'{}' into verse from jsonb_array_elements(configured) where value#>>'{}' is distinct from previous order by random() limit 1; end if;
  verse:=coalesce(verse,case when previous is distinct from 'Tudo posso naquele que me fortalece. — Filipenses 4:13' then 'Tudo posso naquele que me fortalece. — Filipenses 4:13' else 'O Senhor é o meu pastor; nada me faltará. — Salmos 23:1' end);
  insert into public.daily_content_history(local_date,verse) values(d,verse) on conflict(local_date) do update set verse=excluded.verse;
  perform public.enqueue_automation_email(admin_email,'daily_summary','daily_summary','daily-summary:'||d,
    jsonb_build_object('customer_name','Thaís','summary_date',to_char(d,'DD/MM/YYYY'),'greeting',case when hour_value<12 then 'Bom dia' when hour_value<18 then 'Boa tarde' else 'Boa noite' end,
      'appointments',(select count(*) from public.appointments where appointment_date=d and status<>'cancelado'),
      'payments',(select count(*) from public.appointments where payment_status='em_analise'),
      'cancellations',(select count(*) from public.appointments where cancelled_at::date=d),
      'fits',(select count(*) from public.booking_requests where created_at::date=d),
      'reschedules',(select count(*) from public.reschedule_requests where created_at::date=d),
      'new_customers',(select count(*) from public.customer_accounts where created_at::date=d),'verse',verse),jsonb_build_object('kind','daily_summary'));
end $$;

revoke all on function public.prepare_daily_summary_email(text) from public;
