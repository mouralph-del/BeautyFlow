-- Public gallery media “Extensão de Cílios”: preserve the eyelash service
-- and add Design com Henna as the second service shown in the modal.
insert into public.gallery_media_services (gallery_media_id, service_id, display_order, is_primary)
values
  ('3aa1d3ed-4c02-4304-979e-feeaea308717', 6, 0, true),
  ('3aa1d3ed-4c02-4304-979e-feeaea308717', 2, 1, false)
on conflict (gallery_media_id, service_id) do nothing;
