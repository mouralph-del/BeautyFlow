create or replace function public.get_admin_email_recipients(fallback_email text)
returns table(admin_user_id uuid, recipient text)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Acesso negado'; end if;
  insert into public.admin_notification_preferences(admin_user_id,email_notifications_enabled)
  select u.id, lower(trim(u.email))=lower(trim(fallback_email))
  from auth.users u
  where u.raw_app_meta_data->>'role'='admin'
  on conflict on constraint admin_notification_preferences_pkey do nothing;
  return query
    select p.admin_user_id, lower(trim(u.email))
    from public.admin_notification_preferences p
    join auth.users u on u.id=p.admin_user_id
    where p.is_active and p.email_notifications_enabled
      and u.raw_app_meta_data->>'role'='admin'
      and nullif(trim(u.email),'') is not null;
end;
$$;

revoke all on function public.get_admin_email_recipients(text) from public,anon,authenticated;
grant execute on function public.get_admin_email_recipients(text) to service_role;
