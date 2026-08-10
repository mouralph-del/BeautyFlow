# Changelog

Todas as mudanças relevantes do BeautyFlow são documentadas neste arquivo.

O formato segue os princípios de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto utiliza versionamento semântico.

## [1.0.0] — 2026-08-10

### Adicionado

- Site institucional com história, serviços, galeria e contato.
- Cadastro, login, recuperação de senha e área protegida da cliente.
- Agendamento com múltiplos serviços, disponibilidade e reserva Pix.
- Cancelamento, remarcação, solicitação de encaixe e histórico.
- Painel administrativo com dashboard, agenda, clientes e solicitações.
- Gestão de serviços, galeria, promoções, financeiro e configurações.
- Feriados, conclusão diária e registro de não comparecimento.
- Central de notificações, preferências individuais e automações.
- Ferramentas locais de onboarding, homologação e feedback.
- Manuais, release notes e estudo de caso.

### Alterado

- Rotas separadas por lazy loading e code splitting.
- Modais e drawers padronizados com acessibilidade por teclado.
- Galeria ampliada para zero, um ou vários serviços.
- Promoções integradas ao agendamento por operação transacional.
- Área da cliente reorganizada para acompanhamento dos atendimentos.

### Corrigido

- Datas e calendários estabilizados em `America/Sao_Paulo`.
- Idempotência financeira e deduplicação de notificações e e-mails.
- Fluxos de remarcação, encaixe, conclusão e não comparecimento.
- Carregamento de mídia, fallbacks e responsividade.

### Segurança

- RLS aplicada às estruturas protegidas.
- RPCs administrativas com validação por `is_admin()`.
- Comprovantes privados acessados por URLs assinadas.
- Ausência de credenciais `service_role` no frontend.
- Funções críticas com permissões e `search_path` controlados.

## Documentação detalhada

O histórico completo das sprints e decisões permanece em [docs/14-Changelog.md](docs/14-Changelog.md).
