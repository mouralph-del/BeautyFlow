alter table public.gallery_media
  add column if not exists title_source text not null default 'service'
    check (title_source in ('service', 'combined', 'custom')),
  add column if not exists custom_title text,
  add column if not exists description_source text not null default 'service'
    check (description_source in ('service', 'custom')),
  add column if not exists custom_description text;

create table if not exists public.gallery_media_services (
  gallery_media_id uuid not null references public.gallery_media(id) on delete cascade,
  service_id bigint not null references public.services(id) on delete cascade,
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (gallery_media_id, service_id)
);

create unique index if not exists gallery_media_services_one_primary
  on public.gallery_media_services(gallery_media_id) where is_primary;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gallery_media' and column_name = 'service_id'
  ) then
    execute $sql$
      insert into public.gallery_media_services(gallery_media_id, service_id, display_order, is_primary)
      select id, service_id, 0, true from public.gallery_media where service_id is not null
      on conflict (gallery_media_id, service_id) do nothing
    $sql$;
  end if;
end $$;

alter table public.gallery_media_services enable row level security;

drop policy if exists "Public can view active gallery associations" on public.gallery_media_services;
create policy "Public can view active gallery associations"
  on public.gallery_media_services for select
  using (exists (
    select 1 from public.gallery_media media
    where media.id = gallery_media_id and media.is_active
  ));

drop policy if exists "Admins can manage gallery associations" on public.gallery_media_services;
create policy "Admins can manage gallery associations"
  on public.gallery_media_services for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_set_gallery_media_services(
  target_media_id uuid,
  target_service_ids bigint[],
  target_primary_service_id bigint default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if not exists (select 1 from public.gallery_media where id = target_media_id) then
    raise exception 'Mídia não encontrada';
  end if;
  if target_primary_service_id is not null
     and not (target_primary_service_id = any(coalesce(target_service_ids, '{}'::bigint[]))) then
    raise exception 'O serviço principal deve estar associado à mídia';
  end if;

  delete from public.gallery_media_services where gallery_media_id = target_media_id;
  insert into public.gallery_media_services(gallery_media_id, service_id, display_order, is_primary)
  select target_media_id, selected.service_id, (selected.ordinality - 1)::integer,
         selected.service_id = target_primary_service_id
  from (
    select distinct on (service_id) service_id, ordinality
    from unnest(coalesce(target_service_ids, '{}'::bigint[])) with ordinality as requested(service_id, ordinality)
    order by service_id, ordinality
  ) selected
  join public.services on services.id = selected.service_id
  order by selected.ordinality;
end;
$$;

revoke all on function public.admin_set_gallery_media_services(uuid,bigint[],bigint) from public;
grant execute on function public.admin_set_gallery_media_services(uuid,bigint[],bigint) to authenticated;
