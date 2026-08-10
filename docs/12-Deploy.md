# 12 — Deploy

O processo está **planejado**; hospedagem e domínio ainda não estão definidos.

## Topologia planejada

1. Origem oficial: `C:\Projetos\BeautyFlow`.
2. Controle de versão com Git e publicação no GitHub.
3. Frontend em hospedagem compatível com Vite, por exemplo Vercel.
4. Backend no Supabase.
5. Entrega transacional no Resend; recuperação de senha pelo SMTP do Supabase Auth.

## Configuração

Frontend exige `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, conforme `src/lib/supabase.js`. Nunca use `service_role` ou segredo privado em `VITE_*`. O `.env.example` versionado contém somente nomes e exemplos seguros.

Edge Functions exigem `RESEND_API_KEY`, `PAYMENT_EMAIL_FROM`, `THAIS_ADMIN_EMAIL` e `SITE_URL`; o Supabase fornece internamente URL, anon e `service_role`. Vault exige `beautyflow_project_url` e `beautyflow_publishable_key`. Valores reais não pertencem ao Git.

```powershell
npm install
npm run lint
npm run build
npx supabase db lint
npx supabase db push
npx supabase functions deploy reminders
npx supabase functions deploy daily-summary
npx supabase functions deploy promotion-mailer
```

`notify-payment-status` e `notify-cancellation` são endpoints legados e não fazem parte do deploy rotineiro. Republique-os somente mediante necessidade confirmada e revisão específica.

Os comandos Supabase pressupõem CLI, login e projeto vinculados. Execute migrations antes de funções que dependem do schema. Consulte [Configuração de e-mails](../README_EMAIL_SETUP.md).

## Auth, domínio e e-mail

Configure Site URL e Redirect URLs para produção, preview autorizado, `/nova-senha` e ambiente local necessário. Valide domínio no provedor, HTTPS, DNS do Resend (SPF/DKIM) e SMTP do Auth. Atualize `SITE_URL` após definir o domínio.

## Checklist de produção

- [ ] Git/GitHub configurados e branch protegida.
- [ ] Dependências instaladas de lockfile; lint e build aprovados.
- [ ] Projeto Supabase correto e backup disponível.
- [ ] Migrations aplicadas em ordem e `db lint` aprovado.
- [ ] RLS testado como anon, cliente e admin.
- [ ] Buckets e signed URLs testados sem dados reais.
- [ ] Secrets e Vault configurados apenas no servidor.
- [ ] Edge Functions publicadas e cron verificado.
- [ ] Site/Redirect URLs e domínio HTTPS configurados.
- [ ] SMTP, Resend, SPF/DKIM e e-mails testados.
- [ ] Fluxos críticos e responsividade validados.
- [ ] Logs, rollback e responsáveis operacionais definidos.
