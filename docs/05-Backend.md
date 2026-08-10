# 05 — Backend

O Supabase fornece PostgreSQL, Auth, API, Storage, Vault e Edge Functions. As migrations são a fonte versionada do banco; RLS controla acesso por JWT e funções `security definer` encapsulam operações críticas, sempre com `search_path` explícito nas funções sensíveis.

## Edge Functions existentes

| Função | Responsabilidade |
| --- | --- |
| `notify-payment-status` | Legado; não é chamado diretamente pelo frontend |
| `notify-cancellation` | Legado; não é chamado diretamente pelo frontend |
| `reminders` | Prepara lembretes horários e processa a outbox |
| `daily-summary` | Prepara e envia o resumo administrativo diário |
| `promotion-mailer` | Prepara campanhas elegíveis e processa a outbox |

`supabase/functions/_shared/email.ts` cria o cliente servidor, lê apenas secrets, renderiza templates, consulta preferências, evita duplicidade por `event_key`, registra entrega e processa retentativas.

O fluxo ativo de pagamentos e cancelamentos usa RPCs, triggers/outbox e os processadores compartilhados. Os dois endpoints legados permanecem versionados para decisão futura e não foram removidos nem republicados na Sprint 5.

## RPCs principais por categoria

- **Agendamento/pagamento:** `create_appointment_with_services`, `get_booked_times`, `get_public_day_availability`, `review_appointment_payment`, `admin_review_payment`.
- **Agenda:** `admin_create_manual_appointment`, `release_monthly_schedule`, `assert_appointment_slot_available`.
- **Cancelamento:** `get_cancellation_details`, `cancel_customer_appointment`.
- **Remarcação:** `customer_create_reschedule_request`, `customer_cancel_reschedule_request`, `customer_respond_reschedule_proposal`, `get_reschedule_booked_times`, `admin_review_reschedule_request`.
- **Encaixe:** `customer_create_fit_request`, `customer_respond_fit_proposal`, `customer_submit_fit_payment`, `admin_review_booking_request`, `expire_fit_request_proposals`.
- **Clientes:** `get_customer_space`, `link_customer_history`, `get_admin_customers`, `admin_add_customer_note`, `admin_set_customer_active`.
- **Promoções:** `get_active_promotions`, `admin_save_promotion`, `admin_change_promotion`, `admin_duplicate_promotion`.
- **Financeiro:** `admin_get_financial_data`, `admin_record_payment`, `admin_save_expense`, `admin_delete_expense`.
- **Configurações:** `get_public_settings`, `admin_get_settings`, `admin_save_settings`, `admin_save_policy`, `admin_save_notifications`, `admin_save_email_template`, `admin_set_role`.
- **E-mail:** `enqueue_automation_email`, `claim_automation_email_outbox`, `complete_automation_email`, preparadores horários, promocionais e diário.

Storage contém `payment-proofs` (privado), `gallery-media` e `promotion-media` (públicos). Vault guarda somente os valores usados pelo cron para chamar funções; secrets do runtime ficam no Supabase. Nunca documente seus valores.
