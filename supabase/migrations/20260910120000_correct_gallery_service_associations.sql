-- Correct only the four manually confirmed public gallery/service mappings.
-- The IDs are resolved by slug so this stays aligned with the current catalog.
do $$
declare
  brow_lamination_without_tint bigint;
  design_personalizado_id bigint;
  design_com_henna_id bigint;
  extensao_de_cilios_id bigint;
begin
  select id into brow_lamination_without_tint from public.services where slug = 'brow-lamination-sem-tintura';
  select id into design_personalizado_id from public.services where slug = 'design-personalizado';
  select id into design_com_henna_id from public.services where slug = 'design-com-henna';
  select id into extensao_de_cilios_id from public.services where slug = 'extensao-de-cilios';

  if brow_lamination_without_tint is null
    or design_personalizado_id is null
    or design_com_henna_id is null
    or extensao_de_cilios_id is null then
    raise exception 'Required gallery services were not found in the catalog';
  end if;

  -- These three items were manually confirmed as Brow Lamination without tint.
  delete from public.gallery_media_services
  where gallery_media_id in (
    '4cca5bca-83b8-44ef-9d0a-f507330bbe6b',
    '29e970d2-3f7e-4e15-ad1b-8e413fb8e906',
    'edc08ab2-ebea-46dc-a7e4-dbcb995df232'
  );

  insert into public.gallery_media_services (gallery_media_id, service_id, display_order, is_primary)
  values
    ('4cca5bca-83b8-44ef-9d0a-f507330bbe6b', brow_lamination_without_tint, 0, true),
    ('29e970d2-3f7e-4e15-ad1b-8e413fb8e906', brow_lamination_without_tint, 0, true),
    ('edc08ab2-ebea-46dc-a7e4-dbcb995df232', brow_lamination_without_tint, 0, true)
  on conflict (gallery_media_id, service_id) do update
    set display_order = excluded.display_order,
        is_primary = excluded.is_primary;

  -- Keep eyelash extensions as primary, replace only Henna with Design Personalizado.
  delete from public.gallery_media_services
  where gallery_media_id = '3aa1d3ed-4c02-4304-979e-feeaea308717'
    and service_id = design_com_henna_id;

  insert into public.gallery_media_services (gallery_media_id, service_id, display_order, is_primary)
  values ('3aa1d3ed-4c02-4304-979e-feeaea308717', design_personalizado_id, 1, false)
  on conflict (gallery_media_id, service_id) do update
    set display_order = excluded.display_order,
        is_primary = excluded.is_primary;

  update public.gallery_media_services
  set display_order = 0,
      is_primary = true
  where gallery_media_id = '3aa1d3ed-4c02-4304-979e-feeaea308717'
    and service_id = extensao_de_cilios_id;
end $$;
