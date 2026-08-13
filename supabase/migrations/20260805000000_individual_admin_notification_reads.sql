-- Unifica Dashboard e sininho no mesmo estado individual de leitura e aplica
-- a preferência de exibição no painel sem afetar as preferências de e-mail.
create or replace function public.get_admin_notification_center(page_size integer default 20,page_offset integer default 0)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  panel_enabled boolean;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;

  select coalesce(
    (select p.is_active and p.panel_notifications_enabled
       from public.admin_notification_preferences p
      where p.admin_user_id=auth.uid()),
    true
  ) into panel_enabled;

  if not panel_enabled then
    return jsonb_build_object('unread_count',0,'items','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'unread_count',(
      select count(*)
        from public.admin_notifications n
       where not exists(
         select 1 from public.admin_notification_reads r
          where r.notification_id=n.id and r.admin_user_id=auth.uid()
       )
    ),
    'items',coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  ) into result
  from (
    select n.id,n.appointment_id,n.type,n.title,n.message,n.category,n.action_url,n.created_at,
           (r.read_at is not null) is_read
      from public.admin_notifications n
      left join public.admin_notification_reads r
        on r.notification_id=n.id and r.admin_user_id=auth.uid()
     order by n.created_at desc
     limit greatest(1,least(page_size,50)) offset greatest(page_offset,0)
  ) x;

  return result;
end;
$$;

revoke all on function public.get_admin_notification_center(integer,integer) from public;
grant execute on function public.get_admin_notification_center(integer,integer) to authenticated;
