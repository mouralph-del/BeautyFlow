-- Classifica somente incidentes operacionais atuais no Dashboard Admin.
create or replace function public.get_admin_automation_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  select jsonb_build_object(
    'recent_failed_count',count(*) filter (
      where status='failed' and updated_at>=now()-interval '24 hours'
    ),
    'stuck_processing_count',count(*) filter (
      where status='processing' and coalesce(locked_at,updated_at,created_at)<now()-interval '15 minutes'
    ),
    'stale_pending_count',count(*) filter (
      where status='pending'
        and coalesce(next_attempt_at,created_at)<now()-interval '75 minutes'
    ),
    'last_failure_at',max(updated_at) filter (
      where status='failed' and updated_at>=now()-interval '24 hours'
    )
  ) into result
  from public.automation_email_outbox;

  return result;
end;
$$;
