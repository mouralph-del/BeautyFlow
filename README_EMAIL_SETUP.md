# Configuração de e-mails — Beauty Studio

O Beauty Studio envia e-mails pelas Supabase Edge Functions usando o Resend. Nenhuma chave privada deve ser adicionada ao código, ao `.env` do Vite ou a variáveis com prefixo `VITE_`.

## Secrets obrigatórios das Edge Functions

| Secret | Desenvolvimento | Produção |
| --- | --- | --- |
| `RESEND_API_KEY` | Chave de teste criada no Resend | Chave restrita ao domínio de produção |
| `PAYMENT_EMAIL_FROM` | `Beauty Studio <onboarding@resend.dev>` enquanto o domínio não estiver validado | `Beauty Studio <agendamentos@seudominio.com.br>` |
| `THAIS_ADMIN_EMAIL` | E-mail verificado permitido pela conta de teste | E-mail administrativo real do estúdio |
| `SITE_URL` | `http://localhost:5173` | URL HTTPS publicada do Beauty Studio |

O remetente `onboarding@resend.dev` é adequado somente para testes e segue as limitações da conta Resend. Em produção, use um domínio próprio verificado.

## Configurar o Resend

1. Crie a conta em <https://resend.com/>.
2. Em **API Keys**, crie uma chave para o Beauty Studio.
3. Para desenvolvimento, use o remetente de teste do Resend.
4. Para produção, abra **Domains**, adicione o domínio oficial e cadastre no provedor de DNS os registros SPF e DKIM fornecidos.
5. Aguarde o domínio aparecer como verificado.
6. Crie uma nova API Key restrita ao envio e atualize `PAYMENT_EMAIL_FROM` para um endereço do domínio validado.

## Configurar os secrets no Supabase

Execute dentro de `C:\Projetos\BeautyFlow`, substituindo os valores entre `<...>`:

```powershell
npx supabase secrets set RESEND_API_KEY="<CHAVE_RESEND>"
npx supabase secrets set PAYMENT_EMAIL_FROM="Beauty Studio <agendamentos@seudominio.com.br>"
npx supabase secrets set THAIS_ADMIN_EMAIL="<EMAIL_ADMINISTRATIVO>"
npx supabase secrets set SITE_URL="https://<DOMINIO_DO_SITE>"
```

Para desenvolvimento, os dois últimos valores podem ser o e-mail verificado de teste e `http://localhost:5173`. Secrets das Edge Functions continuam no servidor; não os coloque em variáveis `VITE_`.

Confira apenas os nomes configurados:

```powershell
npx supabase secrets list
```

Depois, publique novamente as funções:

```powershell
npx supabase functions deploy reminders
npx supabase functions deploy daily-summary
npx supabase functions deploy promotion-mailer
```

`notify-payment-status` e `notify-cancellation` são endpoints legados mantidos para compatibilidade. O frontend não os chama diretamente; não devem ser republicados na rotina normal sem uma decisão específica de backend.

## Configurar o Vault para os jobs pg_cron

No SQL Editor do projeto Supabase, execute uma vez, substituindo os valores:

```sql
select vault.create_secret(
  'https://<PROJECT_REF>.supabase.co',
  'beautyflow_project_url',
  'URL pública usada pelos jobs para chamar as Edge Functions'
);

select vault.create_secret(
  '<SUPABASE_PUBLISHABLE_KEY>',
  'beautyflow_publishable_key',
  'Chave publicável usada pelo gateway das Edge Functions'
);
```

Se os secrets já existirem, atualize-os sem criar duplicatas:

```sql
select vault.update_secret(
  id,
  new_secret := 'https://<PROJECT_REF>.supabase.co'
)
from vault.decrypted_secrets
where name = 'beautyflow_project_url';

select vault.update_secret(
  id,
  new_secret := '<SUPABASE_PUBLISHABLE_KEY>'
)
from vault.decrypted_secrets
where name = 'beautyflow_publishable_key';
```

A chave usada no Vault é a **publishable/anon**, nunca a `service_role`. A `service_role` é disponibilizada automaticamente pelo Supabase apenas dentro das Edge Functions.

## Templates e preferências

Todos os envios consultam `notification_preferences` antes de chamar o Resend e renderizam `email_templates`. Se o template solicitado não existir, é usado `automation_fallback`. Os textos e assinaturas devem utilizar “Beauty Studio” ou “Thaís Santos Beauty Studio”.

O HTML é centralizado em `supabase/functions/_shared/email-template.js`: fundo bege, cartão branco, bordas suaves, título e botão marrons, CSS inline e assinatura oficial. Templates podem definir `subtitle`, `button_text` e `button_url`; o link administrativo de pagamentos usa `/admin/solicitacoes?tab=pagamentos`.

Para validar sem envio real, execute `npm run test:unit`. O teste renderiza as variantes localmente e não chama Resend nem Supabase. Antes de habilitar um envio real, confirme que o evento está na outbox, que a preferência está ativa, que o template existe e que a chave idempotente é única.

## Diagnóstico

- Entregas e falhas: tabela `email_delivery_logs`.
- Fila e tentativas: tabela `automation_email_outbox`.
- Campanhas já enviadas: tabela `promotion_email_history`.
- Um secret ausente não expõe dados nem derruba o site; o erro é registrado para nova tentativa.
