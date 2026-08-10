# Inventário técnico — Sprint 5

Auditoria realizada em 10/08/2026 no projeto oficial `C:\Projetos\BeautyFlow`. Nenhuma classificação abaixo autoriza alteração remota.

## Inventário por área

| Área | Arquivos após limpeza | Classificação |
| --- | ---: | --- |
| `src/pages` | 45 | Ativo; JSX de rota e CSS associados |
| `src/components` | 75 | Ativo; componentes compartilhados, booking, cliente e admin |
| `src/hooks` | 6 | Ativo; todos possuem consumidores |
| `src/services` | 21 | Ativo; wrappers consumidos pelo frontend |
| `src/utils` | 8 | Ativo; todos possuem consumidores ou cobertura estrutural |
| `src/contexts` | 3 | Ativo; AuthContext, contexto e hook |
| `src/assets` | 13 | Ativo ou pendente de confirmação; mídia real preservada |
| `public` | 6 | Ativo; família de favicon gerada e sua fonte SVG |
| `tests` | 28 | Ativo; 27 testes/scripts e documentação da suíte |
| `scripts` | 2 | Ativo; favicon e verificação de bundle |
| `supabase/functions` | 8 | Ativo/legado; nenhuma função removida ou publicada |
| `supabase/migrations` | 36 | Histórico; 34 alinhadas e 2 locais pendentes |
| `supabase/test-data` | 3 | Pendente de confirmação; preservado para homologação controlada |
| `docs` | 21 | Ativo/histórico; inclui este inventário |

## Removidos com evidência

| Item | Classificação anterior | Evidência e substituto |
| --- | --- | --- |
| `pages/Cancellation.jsx` + CSS | Obsoleto | Sem rota/import; substituído por `CancellationFlow` |
| `pages/AdminPayments.jsx` + CSS | Obsoleto | Sem rota/import; `/admin/pagamentos` redireciona para Solicitações |
| `services/adminPayments.js` | Duplicado/obsoleto | Consumido somente pela página removida; `adminRequests.js` contém o fluxo ativo |
| `AppointmentsCarousel.jsx` | Obsoleto | Sem import; histórico atual está em `CustomerSpace` e componentes ativos |
| `AppointmentSummary.jsx` | Obsoleto | Sem import; cards atuais usam `CustomerAppointmentCard` |
| `public/icons.svg` | Obsoleto | Sprite de template sem referência |
| `public/favicon.png` | Duplicado | Não referenciado pela aplicação; fixture passou a usar o favicon ativo de 192 px |
| screenshots/logs Playwright | Temporário | 45 artefatos gerados, movidos para área ignorada `test-results/` |

## Mantidos e motivo

- Todas as 36 migrations: histórico imutável. A consulta `migration list --linked` mostrou `20260804500000` e `20260804600000` apenas locais; ambas permanecem pendentes, sem aplicação.
- `reminders`, `daily-summary` e `promotion-mailer`: ativas no fluxo de outbox/cron.
- `notify-payment-status` e `notify-cancellation`: legado referenciado em documentação/backend; preservadas para decisão futura, sem chamada frontend.
- `supabase/test-data/*`: seed e cleanups de homologação controlada; não executados.
- Todas as fotos, vídeos, certificados e logo: conteúdo real ou institucional; nenhuma mídia duvidosa foi removida.
- `sharp`: dev dependency usada por `scripts/generate-favicon.mjs`.
- `jsqr` e `pngjs`: dev dependencies usadas pelos testes Pix.
- Redirect `/admin/pagamentos`: alias compatível para a aba ativa de Solicitações.

## Dependências

Todas as dependências diretas possuem uso confirmado em código, scripts, configuração ou testes. Não há dependência direta duplicada e nenhuma foi removida.

O `npm audit` somente leitura encontrou quatro ocorrências: `react-router-dom`/`react-router` (alta, runtime), `nanoid` (alta, transitiva) e `postcss` (moderada, transitiva). Há correção disponível, mas nenhuma atualização automática foi executada nesta Sprint.

## Segurança e resíduos

- Sessão permanece em `sessionStorage`; somente o e-mail lembrado usa `localStorage`; cookies manuais não são usados.
- Nenhuma senha é persistida e nenhum `service_role` é usado no frontend.
- Correspondências de palavras como `SECRET`/`service_role` foram encontradas somente em documentação segura, testes defensivos, migrations e Edge Functions servidoras; valores reais não foram exibidos nem versionados.
- `.env` continua ignorado e `.env.example` permanece sanitizado.
- Não existem `alert()` ou `confirm()` nativos. Dialogs usam Modal compartilhado ou drawers com `role="dialog"`, `aria-modal` e foco controlado.
- Logs que poderiam imprimir objetos de sessão, comprovante ou respostas foram sanitizados; mensagens diagnósticas genéricas foram preservadas.
- Não há TODO/FIXME/HACK de código. Os cinco `test.fixme` são pendências reais da homologação mutável da versão 1.0 e continuam bloqueados no projeto oficial.

## Complexidade e itens futuros

Arquivos candidatos a manutenção futura, sem divisão automática nesta Sprint: `Booking.jsx` (1.393 linhas), `AdminPanel.css` (1.054), `Booking.css` (1.024), `data/services.js` (722) e `Services.css` (552). Virtualização de listas, análise visual de CSS e atualização controlada de dependências ficam para manutenção/Beauty Studio 2.0 quando houver escopo próprio.
