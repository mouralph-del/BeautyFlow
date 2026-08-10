# 14 — Changelog

## 2026-08-09 — Sprint 3 concluída

- Diálogos centrais consolidados no Modal compartilhado.
- Serviços, Galeria administrativa, Revisão diária, Feriados, Dashboard e liberação mensal padronizados.
- Confirmações e avisos nativos removidos da interface.
- Drawers administrativos receberam foco, teclado, Escape, retorno de foco e controle de scroll.

- Sprint 1 de homologação: detalhes centralizados, histórico e abas corrigidos, remarcação resiliente, redirecionamento completo, links auditados e página 404.

- 1.0 (local, aguardando autorização): saudação diária, versículo estável, resumo da manhã, revisão manual do expediente, mensagem de encerramento e preferências individuais.

Estrutura inspirada em Keep a Changelog. Não há data de lançamento definida.

## [1.0.0] — Em desenvolvimento

### Adicionado

- Site institucional, história, contato, catálogo de serviços e galeria.
- Cadastro, login, recuperação de senha e área da cliente.
- Agendamento com múltiplos serviços, disponibilidade e reserva Pix por comprovante.
- Cancelamento, remarcação e solicitação de encaixe.
- Painel com agenda, solicitações, clientes, catálogo, galeria, promoções, financeiro e configurações.
- RLS, RPCs transacionais, Storage e auditorias.
- Edge Functions, templates, preferências, fila, logs e automações de e-mail.
- Liberação mensal da agenda, horários especiais e bloqueios.

### Alterado

- Identidade pública de e-mails consolidada como Beauty Studio/Thaís Santos Beauty Studio.
- Fluxos de remarcação e encaixe ampliados com resposta da cliente e reanálise de conflito.

### Corrigido

- Conversões de horários em funções de agendamento.
- Ordenação/identidade na listagem administrativa de clientes.
- Seleção de versículo no resumo diário.

### Segurança

- Bucket privado e políticas reforçadas para comprovantes.
- Guarda de sobreposição de agendamentos.
- Configurações públicas filtradas e operações administrativas protegidas.
- Idempotência financeira e deduplicação de e-mails.

### Pendente

- Testes manuais/automatizados finais, acessibilidade e otimização de bundle.
- GitHub, hospedagem, domínio e validação de produção dos e-mails.
# 2026-08-04 — Calendários e notificações

- Corrigido o deslocamento dos dias no calendário do dashboard.
- Centralizados cabeçalhos domingo–sábado e datas locais.
- Adicionada central administrativa no sino, com leitura individual e links inteligentes.
- Adicionados eventos internos idempotentes e preparação pós-atendimento.

## 2026-08-04 — Área da cliente premium

- Dropdown substituído por drawer acessível.
- Meu Espaço reorganizado com histórico em carrossel.
- Criadas páginas protegidas de agendamentos e configurações.
- Reutilizados perfil próprio, Auth, encaixes e remarcações existentes.
- Foto persistente, preferências da cliente e exclusão de conta permanecem futuras por não possuírem backend seguro disponível.

## 2026-08-04 — Bloco final local da versão 1.0

- Gestão e lembretes de feriados.
- Conclusão manual e não comparecimento transacionais.
- Histórico e comunicações idempotentes.
- Rotas divididas por lazy loading e fallback de chunks.
- Migration criada localmente, ainda não aplicada.

## 2026-08-10 — Sprint 4 de performance

- Mantida a separação de todas as páginas por `React.lazy`, isolando rotas públicas, Cliente e Admin.
- Separados vendors React e Supabase em chunks estáveis, preservando o code splitting automático das páginas.
- Aperfeiçoado o fallback central com skeleton responsivo e recuperação amigável de falha de chunk.
- Adicionados lazy loading e decodificação assíncrona às imagens secundárias; vídeos da galeria passaram a carregar somente metadados inicialmente.
- Removido log de desenvolvimento do agendamento e adicionada verificação automatizada da composição do bundle.
- Nenhuma alteração em banco, Supabase, Auth, Pix, migrations, RPCs, RLS, Edge Functions ou regras de negócio.
- Entrypoint reduzido de 452,08 kB para 14,19 kB (96,86%); payload comum total preservado pela manutenção segura do Auth global.

## 2026-08-10 — Sprint 5 de limpeza técnica

- Removidos fluxos frontend antigos de cancelamento e revisão de pagamentos, já substituídos pelas rotas atuais.
- Removidos dois componentes antigos da área da cliente, dois assets públicos obsoletos e artefatos temporários do Playwright.
- Sanitizados logs frontend que poderiam imprimir objetos de erro; diagnósticos genéricos foram preservados.
- Documentados inventário, endpoints legados, migrations locais pendentes e auditoria de dependências.
- Nenhuma alteração remota, migration, Edge Function ou regra de negócio.
