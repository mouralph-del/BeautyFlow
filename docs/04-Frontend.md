# 04 — Frontend

## Sprint 1 de homologação — navegação da cliente

Os cards de agendamento abrem `/minha-conta/agendamentos/:id`, ponto central de consulta e ações compatíveis com o estado. As categorias usam conjuntos explícitos; estados desconhecidos nunca viram concluídos implicitamente. A rota curinga apresenta uma página 404 responsiva e acolhedora.

## Experiência diária administrativa

O Dashboard usa `America/Sao_Paulo` para a saudação, mostra resumo real e conteúdo estável e oferece **Revisar o dia** apenas como ação manual. Sem nome nos metadados, usa saudação neutra e nunca deriva nome do e-mail. Cards viram uma coluna no celular e o modal possui rolagem interna.

## Estrutura

| Pasta | Papel real |
| --- | --- |
| `src/pages` | Páginas de rota e seus CSS |
| `src/components` | Componentes reutilizáveis públicos, de booking, cliente e administração |
| `src/services` | Chamadas ao Auth, Data API, RPCs, Storage e Edge Functions |
| `src/hooks` | Carregamento de catálogo, promoções e configurações públicas |
| `src/contexts` | Sessão global por `AuthContext` e acesso por `useAuth` |
| `src/utils` | Normalização do usuário e utilitários de data/hora |
| `src/layouts` | `Layout` das páginas públicas; `AdminLayout` fica em `components/admin` |

Os componentes chamam funções de `services`, evitando espalhar detalhes do Supabase pela interface. O cliente é criado em `src/lib/supabase.js` com variáveis públicas do Vite.

## Rotas encontradas em `App.jsx`

**Públicas:** `/`, `/contato`, `/galeria`, `/minha-historia`, `/entrar`, `/cadastro`, `/recuperar-senha`, `/nova-senha`, `/servicos`, `/servicos/:slug`, `/agendamento/:id` e `/cancelar-agendamento/:id`.

**Protegida:** `/minha-conta` (“Meu Espaço”). `ProtectedRoute` aguarda a sessão e redireciona visitantes para `/entrar`, preservando o caminho de origem.

**Administrativas:** `/admin`, `/admin/financeiro`, `/admin/servicos`, `/admin/galeria`, `/admin/agenda`, `/admin/solicitacoes`, `/admin/clientes`, `/admin/promocoes` e `/admin/configuracoes`. `/admin/pagamentos` redireciona para a aba de pagamentos em solicitações.

`AdminRoute` exige usuário e `user.app_metadata.role === "admin"`; isso melhora a navegação, mas a segurança efetiva continua no RLS/RPC. `AdminLayout` compõe sidebar, cabeçalho, conteúdo, notificações e rodapé responsivo.

## Áreas

- **Pública:** apresentação, catálogo, galeria, contato e entrada no agendamento.
- **Meu Espaço:** compromissos, notificações, remarcações e encaixes da conta autenticada.
- **Admin:** operação do estúdio com telas especializadas e layout compartilhado.

Ao modificar, mantenha estados de carregamento/erro, acessibilidade básica, validação no servidor e contratos dos services. Não trate ocultação visual como autorização.
# Sessão e perfil no agendamento

O cliente Supabase usa `sessionStorage`: refresh e navegação interna mantêm a sessão, mas uma nova sessão do navegador exige login. “Lembrar meu e-mail neste dispositivo” grava somente o e-mail no `localStorage`; senhas permanecem sob responsabilidade do gerenciador seguro do navegador.

No agendamento autenticado, o perfil próprio é carregado de `customer_accounts`. Dados completos são apresentados para confirmação e podem ser alterados; o e-mail é sempre o da sessão autenticada.

## Área da cliente

A área autenticada usa `/minha-conta` como Meu Espaço, com páginas protegidas em `/minha-conta/agendamentos` e `/minha-conta/configuracoes`. O avatar abre um drawer lateral; a página principal reúne próximo atendimento, histórico em carrossel, promoções, encaixes e remarcações usando os services existentes.

## Carregamento por rota

As páginas públicas, da cliente e administrativas usam `React.lazy` e `Suspense`, com fallback visual e recuperação amigável para falha de chunk.

### Sprint 4 — estratégia de performance

- Todas as páginas de rota permanecem em imports dinâmicos; áreas pública, Cliente e Admin geram chunks independentes.
- `RouteLoadingBoundary` centraliza o skeleton de carregamento e a recuperação de falhas, sem expor detalhes técnicos.
- O Vite separa apenas dois grupos estáveis: `vendor-react` e `vendor-supabase`; os demais módulos seguem o code splitting automático.
- Imagens secundárias usam carregamento lazy e decodificação assíncrona. O mapa de Contato já utiliza o lazy loading nativo do iframe e só existe no chunk da rota `/contato`.
- Vídeos da galeria carregam metadados inicialmente, evitando antecipar o download integral dos arquivos.
- Assets de produção mantêm nomes com hash para cache versionado. Não há Service Worker nem PWA.

Medição local de produção em 10/08/2026 (`vite v8.1.5`):

| Métrica | Antes | Depois |
| --- | ---: | ---: |
| Módulos processados | 2.871 | 2.871 |
| Entrypoint da aplicação | 452,08 kB | 14,19 kB |
| Entrypoint gzip | 132,01 kB | 4,70 kB |
| Chunks JavaScript | 64 | 67 |
| CSS | 30 chunks | 30 chunks |

O código comum foi explicitado em `vendor-react` (232,36 kB; 74,73 kB gzip) e `vendor-supabase` (204,74 kB; 52,53 kB gzip). Isso reduz o arquivo de entrada em 437,89 kB (96,86%) e melhora o cache entre deploys. O payload comum total permanece praticamente estável, como esperado, porque Auth e sessão continuam globais; mudar esse contrato ficou fora desta Sprint. O calendário permanece sob demanda em `react-datepicker` (154,69 kB; 39,92 kB gzip), carregado apenas pelo agendamento.

## Sprint 2 — Experiência da cliente

- Implementado sistema padrão de skeletons em `src/components/Skeleton` para unificar carregamentos.
- Adicionado `ToastProvider` em `src/components/Toast` e hook `src/hooks/useToast.js` para notificações padronizadas.
- Componente `Avatar` em `src/components/Avatar` com fallback para iniciais e skeleton enquanto carrega.
- Componente `ImageWithFallback` em `src/components/Image` para evitar imagens quebradas em cards e galerias.
- Não houve alterações em banco, Supabase, migrations, RPCs, Edge Functions ou regras de negócio.
