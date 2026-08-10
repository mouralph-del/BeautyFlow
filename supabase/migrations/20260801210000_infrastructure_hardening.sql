-- Mantém o bucket privado: arquivos são lidos somente por URL assinada
-- criada por uma administradora autenticada.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clientes enviam comprovantes" on storage.objects;
create policy "Clientes enviam comprovantes"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'payment-proofs'
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpe?g|pdf)$'
);

drop policy if exists "Clientes removem comprovantes em rollback"
  on storage.objects;
drop policy if exists "Usuários removem os próprios comprovantes"
  on storage.objects;
create policy "Usuários removem os próprios comprovantes"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and owner_id = auth.uid()::text
);

drop policy if exists "Admins can delete payment proofs"
  on storage.objects;
create policy "Admins can delete payment proofs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

drop policy if exists "Admins can read payment proofs"
  on storage.objects;
create policy "Admins can read payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

comment on function public.review_appointment_payment(text, boolean) is
  'OBSOLETA: substituída por public.admin_review_payment(uuid, boolean, text, text). Não remover até eliminar o serviço legado src/services/adminPayments.js.';

