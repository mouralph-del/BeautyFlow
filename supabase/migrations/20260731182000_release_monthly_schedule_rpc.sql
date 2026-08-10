create or replace function public.release_monthly_schedule(
  target_year integer,
  target_month integer,
  target_blocked_dates date[] default '{}',
  target_special_hours jsonb default '{}',
  target_admin_notes text default null,
  target_released_by_name text default null
)
returns public.monthly_schedule_releases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.monthly_schedule_releases;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using
      errcode = '42501',
      message = 'Apenas administradores podem liberar a agenda.';
  end if;

  if target_year not between 2020 and 2100 or target_month not between 1 and 12 then
    raise exception using
      errcode = '22023',
      message = 'Mês ou ano inválido.';
  end if;

  insert into public.monthly_schedule_releases (
    year,
    month,
    status,
    blocked_dates,
    special_hours,
    admin_notes,
    released_at,
    released_by,
    released_by_name,
    updated_at
  ) values (
    target_year,
    target_month,
    'released',
    coalesce(target_blocked_dates, '{}'),
    coalesce(target_special_hours, '{}'),
    nullif(trim(target_admin_notes), ''),
    now(),
    auth.uid(),
    nullif(trim(target_released_by_name), ''),
    now()
  )
  on conflict (year, month) do update set
    status = 'released',
    blocked_dates = excluded.blocked_dates,
    special_hours = excluded.special_hours,
    admin_notes = excluded.admin_notes,
    released_at = excluded.released_at,
    released_by = excluded.released_by,
    released_by_name = excluded.released_by_name,
    updated_at = excluded.updated_at
  returning * into result;

  return result;
end;
$$;

revoke all on function public.release_monthly_schedule(integer, integer, date[], jsonb, text, text) from public;
grant execute on function public.release_monthly_schedule(integer, integer, date[], jsonb, text, text) to authenticated;
