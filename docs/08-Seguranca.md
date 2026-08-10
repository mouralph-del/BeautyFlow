# 08 — Segurança

As RPCs da experiência diária exigem `is_admin()`. Revisões são legíveis apenas pelo próprio `admin_user_id`; resumos por e-mail omitem contatos de clientes, comprovantes, Pix e observações privadas. Secrets permanecem no servidor.

## Camadas confirmadas

- Supabase Auth emite a sessão/JWT; `app_metadata.role` identifica administradores.
- `AdminRoute` e `ProtectedRoute` melhoram a navegação, mas RLS e RPCs são a barreira efetiva.
- As tabelas funcionais têm RLS; políticas distinguem público, titular e admin.
- RPCs administrativas chamam `is_admin()` ou verificam o claim antes de alterar dados.
- `service_role` é lido apenas nas Edge Functions pelo ambiente do Supabase.
- `payment-proofs` é privado; administradores recebem signed URLs de dez minutos.
- Políticas de Storage limitam bucket, dono/pasta e papel. Galeria e promoção são públicas por finalidade.
- Vault guarda URL/chave publicável usadas pelo cron; secrets de e-mail ficam no runtime.
- `guard_appointment_overlap` e validações transacionais impedem sobreposição, inclusive em concorrência.
- Índice parcial e `idempotency_key` evitam registros financeiros repetidos.
- Tabelas `*_activity`, logs e versões de políticas preservam auditoria.

O token de cancelamento permite fluxo público específico e é conferido também pela Edge Function; usuária autenticada pode ser validada por identidade. Dados privados de settings nunca são retornados por `get_public_settings`.

## Nunca fazer

- Nunca colocar `service_role` no frontend.
- Nunca versionar `.env`.
- Nunca usar chaves privadas com prefixo `VITE_`.
- Nunca remover RLS sem revisão de políticas, grants e testes por papel.
- Nunca confiar apenas na validação do navegador ou em `AdminRoute`.
- Nunca apagar migrations aplicadas sem reparar o histórico do Supabase.
- Nunca registrar e-mail, telefone, Pix, tokens ou conteúdo de comprovante em documentação/logs de desenvolvimento.
- Nunca ampliar uma função `security definer` sem validar autorização e `search_path`.

Revisões devem testar anon, cliente titular, outra cliente e admin. Signed URLs devem continuar curtas e secrets devem ser rotacionados se houver suspeita de exposição.
# Autenticação e isolamento

As sessões são mantidas somente durante a sessão do navegador. A opção lembrar conta armazena apenas o e-mail, enquanto a senha é gerenciada pelo navegador. As RPCs de perfil derivam identidade e e-mail de `auth.uid()`/JWT e não aceitam um `user_id` escolhido pelo frontend. Preferências administrativas têm RLS e nunca são públicas.

`admin_notification_reads` aplica leitura individual por `auth.uid()`. A central e as mutações são expostas apenas por RPCs que verificam `is_admin()`. URLs guardam somente identificadores técnicos necessários à navegação.

## Área autenticada da cliente

Todas as rotas da cliente permanecem sob `ProtectedRoute`. Perfil é lido e alterado exclusivamente pelas RPCs de perfil próprio. E-mail, senha e encerramento global de sessões usam Supabase Auth; senhas não são persistidas no navegador. Não há exclusão de conta no frontend sem um fluxo seguro no backend.

## Desfechos administrativos

Feriados, conclusão e não comparecimento exigem `is_admin()`. Conclusão bloqueia o agendamento, usa chaves idempotentes e não aceita confiança exclusiva em valores do frontend. Observações internas não são retornadas à área da cliente.
