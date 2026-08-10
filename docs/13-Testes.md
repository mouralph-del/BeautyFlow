# 13 — Testes

## Sprint 3 — dialogs

`tests/sprint3-dialogs.test.js` impede a reintrodução de dialogs nativos, verifica a centralização dos dialogs no Modal compartilhado e valida o contrato dos drawers. Os E2E mutáveis continuam ignorados.

A Sprint 1 cobre detalhes, classificação estrita das abas, histórico somente realizado, remarcação sem atendimento carregado, 404, retorno após login, links do Drawer e ausência de mensagens técnicas. Os E2E mutáveis continuam ignorados.

A experiência diária cobre saudação por faixa, timezone, nome neutro, contextos do dia, estabilidade e separação do conteúdo, idempotência, preferência/e-mail e autorização administrativa. Testes não enviam e-mails nem criam dados remotos.

## Estratégia

O `package.json` oferece lint e build; não há framework de testes automatizados configurado. Migrations registram funções e constraints, mas o repositório não contém evidência suficiente para declarar `supabase db lint`, `db push` ou validações remotas de RPC como aprovados nesta revisão.

### Técnicos

- `npm run lint` — executar a cada mudança.
- `npm run build` — executar antes de publicar.
- `npx supabase db lint` — **Pendente**, requer CLI/projeto adequados.
- `npx supabase db push` — operação de deploy, executar primeiro em ambiente controlado.
- RPCs — validar casos felizes, autorização, conflito, idempotência e rollback.

### Matriz manual inicial

| Fluxo | Cenário | Resultado esperado | Status |
| --- | --- | --- | --- |
| Visitante | Navegar site, catálogo e galeria | Conteúdo ativo, sem dados privados | Pendente |
| Cadastro/login | Criar conta, entrar e sair | Sessão e conta vinculadas corretamente | Pendente |
| Recuperação | Solicitar e definir nova senha | Link/redirect válidos e sessões encerradas | Pendente |
| Agendamento | Selecionar múltiplos serviços e slot | Duração/valores corretos, sem conflito | Pendente |
| Pix | Enviar arquivo permitido | Comprovante privado e estado em análise | Pendente |
| Admin/pagamento | Aprovar e recusar | Status, financeiro e e-mail coerentes | Pendente |
| Cancelamento | Token e cliente autenticada | Slot liberado, taxa preservada e notificação | Pendente |
| Remarcação | Propor, aceitar e criar conflito concorrente | Original preservado até troca válida | Pendente |
| Encaixe | Aceitar/recusar/expirar proposta | Sem reserva precoce; criação válida após aceite | Pendente |
| Agenda | Liberar mês, bloquear e criar exceção | Disponibilidade pública coerente | Pendente |
| Clientes | Notas, bloqueio e histórico | Acesso administrativo e auditoria | Pendente |
| Serviços/galeria | Criar, pausar, ordenar e enviar mídia | Público vê apenas ativos; histórico preservado | Pendente |
| Promoções | Vigência, público e duplicidade | Elegibilidade correta e um envio por cliente | Pendente |
| Financeiro | Reserva, parcial, total e repetição | Totais corretos; duplicidade recusada | Pendente |
| Configurações | Alterar perfil, agenda, política e template | Publicação filtrada e auditoria | Pendente |
| E-mails | Ausência de secret, retry e duplicidade | Falha registrada; retentativa; sem reenvio | Pendente |
| Mobile/desktop | Breakpoints, modais, drawer e tabelas | Operação sem corte ou bloqueio | Pendente |
| Segurança | anon, outra cliente e não admin | Operações não autorizadas negadas | Pendente |

## Automação futura

- Unitários para horários, normalização e regras puras.
- Integração para RPCs, RLS, Storage e triggers em banco isolado.
- E2E com Playwright ou equivalente para visitante, cliente e admin.
- Testes de acessibilidade, viewport móvel e falhas de rede.

Nunca execute testes destrutivos ou e-mails reais contra produção.
# Validações de comprovantes e e-mails

`npm run test:unit` valida arquivos permitidos, MIME/extensão, arquivo vazio, limite de 10 MB e renderização local dos e-mails. Esses testes não enviam e-mails reais. O HTML administrativo também é verificado para não conter chave Pix nem caminho permanente do comprovante.

Os testes estáticos de autenticação verificam `sessionStorage`, ausência de persistência manual de senha, vínculo de perfil a `auth.uid()`, e resolução de e-mails administrativos por preferências com fallback em secret. Cenários que criam conta, sessão ou agendamento no ambiente oficial permanecem ignorados até homologação controlada.

Os testes de calendário cobrem agosto/2026, fevereiro bissexto/2028, início no domingo e sábado, virada anual e meia-noite no timezone de São Paulo. A central de notificações tem verificações de contador, leitura individual, RLS, links e `event_key`.

## Área da cliente

`tests/customer-area.test.js` valida estruturalmente o drawer, suas rotas protegidas, o estado vazio, a condição do carrossel, o agrupamento de múltiplos serviços e a segurança do perfil e da senha. Os E2E públicos continuam sem criar dados no projeto oficial.

## Bloco final 1.0

`tests/release-readiness-block.test.js` cobre contratos de feriados, lembretes, conclusão, não comparecimento, privacidade, lazy loading e tempo relativo. Cenários mutáveis continuam proibidos no projeto oficial.

## Sprint 4 — performance e chunks

`tests/performance-loading.test.js` verifica imports dinâmicos, guards, skeleton, recuperação de erro e carregamento não bloqueante de mídia. `npm run test:bundle`, executado após o build, confirma sem depender de hashes que `AdminDashboard`, `AdminFinance` e `CustomerSpace` possuem chunks próprios e não integram o entrypoint público. Os E2E públicos revalidam rotas e ausência de overflow nos viewports homologados; cenários mutáveis permanecem ignorados.

## Sprint 2 — Testes adicionados

- Adicionado teste básico para `getAppointmentImage` em `tests/customerAppointments.test.js`.
- Próximos passos: criar testes unitários para skeletons, avatar (loading/error), `ImageWithFallback` e `ToastProvider` (renderização e comportamento de enfileiramento).
