create extension if not exists pg_net;
create extension if not exists supabase_vault;

create or replace function public.invoke_beautyflow_automation(function_name text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  project_url text;
  publishable_key text;
  request_id bigint;
begin
  if function_name not in ('reminders', 'daily-summary', 'promotion-mailer') then
    raise exception 'Executor de automação inválido';
  end if;

  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'beautyflow_project_url'
  limit 1;

  select decrypted_secret into publishable_key
  from vault.decrypted_secrets
  where name = 'beautyflow_publishable_key'
  limit 1;

  if nullif(project_url, '') is null or nullif(publishable_key, '') is null then
    raise warning 'Automação % não executada: configure beautyflow_project_url e beautyflow_publishable_key no Vault.', function_name;
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || publishable_key,
      'apikey', publishable_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_beautyflow_automation(text) from public;

do $$
declare job_id bigint;
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron;

    for job_id in
      select jobid from cron.job where jobname in (
        'beautyflow-hourly-email-preparation',
        'beautyflow-daily-promotion-preparation',
        'beautyflow-hourly-email-executor',
        'beautyflow-daily-summary-executor',
        'beautyflow-daily-promotion-executor',
        'beautyflow-monthly-schedule-email-executor'
      )
    loop
      perform cron.unschedule(job_id);
    end loop;

    perform cron.schedule(
      'beautyflow-hourly-email-executor',
      '5 * * * *',
      $job$select public.invoke_beautyflow_automation('reminders');$job$
    );
    perform cron.schedule(
      'beautyflow-daily-summary-executor',
      '0 10 * * *',
      $job$select public.invoke_beautyflow_automation('daily-summary');$job$
    );
    perform cron.schedule(
      'beautyflow-daily-promotion-executor',
      '15 11 * * *',
      $job$select public.invoke_beautyflow_automation('promotion-mailer');$job$
    );
    perform cron.schedule(
      'beautyflow-monthly-schedule-email-executor',
      '10 12 20,25,28-31 * *',
      $job$select public.invoke_beautyflow_automation('reminders');$job$
    );
  end if;
exception when others then
  raise notice 'Os jobs das Edge Functions não puderam ser configurados automaticamente: %', sqlerrm;
end $$;
