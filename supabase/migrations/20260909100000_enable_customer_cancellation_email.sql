-- O cancelamento é uma comunicação transacional da cliente.
-- Mantém as demais preferências e os avisos administrativos inalterados.
update public.notification_preferences
set email_enabled = true
where id = 'cancellation';
