-- Monitoramento administrativo agregado. O marco operacional exclui as dez
-- falhas históricas conhecidas, sem apagar ou modificar qualquer registro.
create or replace function public.get_admin_automation_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  operational_since constant timestamptz := '2026-08-13 00:00:00+00';
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  select jsonb_build_object(
    'recent_failed_count',count(*) filter (
      where status='failed' and created_at>=operational_since
    ),
    'stuck_processing_count',count(*) filter (
      where status='processing' and coalesce(locked_at,updated_at,created_at)<now()-interval '15 minutes'
    ),
    'stale_pending_count',count(*) filter (
      where status='pending' and created_at<now()-interval '15 minutes'
    ),
    'last_failure_at',max(updated_at) filter (
      where status='failed' and created_at>=operational_since
    )
  ) into result
  from public.automation_email_outbox;

  return result;
end;
$$;

revoke all on function public.get_admin_automation_health() from public,anon;
grant execute on function public.get_admin_automation_health() to authenticated;
