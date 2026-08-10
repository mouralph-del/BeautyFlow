insert into public.gallery_media
  (storage_path, public_url, media_type, title, category, alt_text, display_order, is_active, is_featured, preferred_position)
values
  ('gallery/photos/resultado-04.jpeg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/resultado-04.jpeg','photo','Design natural','Sobrancelhas','Resultado natural de design de sobrancelhas',1,true,true,'side'),
  ('gallery/photos/resultado-02.jpeg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/resultado-02.jpeg','photo','Design com henna','Sobrancelhas','Resultado de design de sobrancelhas com henna',2,true,true,'side'),
  ('gallery/videos/atendimento-01.mp4','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/videos/atendimento-01.mp4','video','Atendimento no estúdio','Atendimento','Vídeo de atendimento no Thaís Santos Beauty Studio',3,true,true,'center'),
  ('gallery/photos/resultado-03.jpeg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/resultado-03.jpeg','photo','Design delicado','Sobrancelhas','Resultado delicado de design de sobrancelhas',4,true,true,'side'),
  ('gallery/photos/resultado-01.jpeg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/resultado-01.jpeg','photo','Design personalizado','Sobrancelhas','Resultado de design de sobrancelhas personalizado',5,true,true,'side'),
  ('gallery/photos/design-com-henna.jpg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/design-com-henna.jpg','photo','Design com henna','Sobrancelhas','Resultado de design com henna',6,true,false,null),
  ('gallery/videos/atendimento-02.mp4','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/videos/atendimento-02.mp4','video','Procedimento no estúdio','Atendimento','Vídeo de procedimento realizado no estúdio',7,true,false,null),
  ('gallery/photos/microblading.jpg','https://uckezdozxfnctorbhwfh.supabase.co/storage/v1/object/public/gallery-media/gallery/photos/microblading.jpg','photo','Microblading fio a fio','Micropigmentação','Resultado de microblading fio a fio',8,true,false,null)
on conflict (storage_path) do nothing;
