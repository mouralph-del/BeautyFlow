update public.email_templates
set
  subject = case id
    when 'signup' then 'Bem-vinda ao Beauty Studio'
    when 'automation_fallback' then 'Atualização do Beauty Studio'
    else subject
  end,
  body = replace(body, 'BeautyFlow', 'Beauty Studio'),
  signature = 'Thaís Santos Beauty Studio',
  updated_at = now()
where id in (
  'automation_fallback', 'signup', 'payment_review', 'payment_confirmed',
  'payment_refused', 'appointment_confirmed', 'cancellation', 'reminder_24h',
  'promotion', 'reschedule_approved', 'reschedule_rejected',
  'reschedule_proposed', 'fit_approved', 'fit_rejected', 'daily_summary',
  'schedule_release'
);
