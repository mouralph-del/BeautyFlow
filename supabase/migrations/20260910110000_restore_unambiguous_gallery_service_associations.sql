-- Restore only public gallery/service links whose current media title exactly
-- matches one active catalog service. Ambiguous "Brow Lamination" media are
-- intentionally excluded until their tintura variant is confirmed.
insert into public.gallery_media_services (gallery_media_id, service_id, display_order, is_primary)
values
  ('77b6a896-9b16-4513-86a0-c17b2fb99446', 4, 0, true),
  ('859a7278-cd8e-424d-a6a2-89089200e9bd', 4, 0, true),
  ('c579a85e-0b07-4d13-adc3-0da8059bf0cb', 2, 0, true),
  ('8022c276-39c9-4cb0-a0e8-68bebf9c5840', 1, 0, true)
on conflict (gallery_media_id, service_id) do nothing;
