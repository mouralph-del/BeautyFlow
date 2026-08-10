alter table public.gallery_media
  add column if not exists is_central_video boolean not null default false;

update public.gallery_media
set is_central_video = true
where media_type = 'video' and preferred_position = 'center';
