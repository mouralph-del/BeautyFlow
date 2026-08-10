alter table public.monthly_schedule_releases
  add column if not exists released_by_name text;
