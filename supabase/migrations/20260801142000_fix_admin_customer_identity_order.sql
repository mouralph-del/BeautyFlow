do $$
declare function_ddl text;
begin
  select pg_get_functiondef(p.oid) into function_ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='get_admin_customers';
  function_ddl:=replace(function_ddl,'order by identity_key,a.created_at','order by identity_key,created_at');
  execute function_ddl;
end $$;
