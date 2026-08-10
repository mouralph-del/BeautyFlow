# BeautyFlow — Estudo de Caso

## 1. Introdução

O **BeautyFlow** é uma aplicação web completa para gestão de estúdios de beleza. O produto foi desenvolvido inicialmente para o Thaís Santos Beauty Studio e utiliza **Beauty Studio** como identidade apresentada às clientes, enquanto BeautyFlow permanece como nome técnico do sistema.

O projeto resolve um problema comum em pequenos negócios de beleza: informações e tarefas importantes ficam distribuídas entre mensagens, agendas informais, comprovantes, anotações e ferramentas diferentes. Essa fragmentação dificulta o controle dos horários, o acompanhamento dos pagamentos e a manutenção de uma experiência consistente para a cliente.

O BeautyFlow reúne em um único fluxo:

- presença institucional na web;
- catálogo de serviços e galeria de resultados;
- criação de conta e autenticação;
- agendamento com disponibilidade real;
- pagamento de reserva via Pix;
- envio e análise de comprovantes;
- área protegida da cliente;
- agenda e operação administrativa;
- promoções, financeiro e configurações;
- notificações, e-mails e automações.

### Quem utiliza

- **Visitantes:** conhecem o estúdio, consultam serviços, galeria e contato.
- **Clientes:** criam conta, agendam, pagam a reserva e acompanham atendimentos.
- **Administradoras:** organizam agenda, clientes, solicitações, catálogo, promoções, galeria, financeiro e configurações.

### Objetivos do projeto

1. Reduzir trabalho manual e informações dispersas.
2. Oferecer uma jornada clara de agendamento para a cliente.
3. Preservar segurança, privacidade e consistência financeira.
4. Dar às administradoras uma visão operacional centralizada.
5. Criar uma base sustentável para evolução após a versão 1.0.

---

## 2. Levantamento de requisitos

Os requisitos surgiram de forma incremental, acompanhando a rotina real do estúdio. Cada fluxo foi detalhado a partir de ações que a cliente ou a administradora precisava executar, dos dados necessários e dos riscos envolvidos.

O levantamento não se limitou às telas. Foram considerados estados intermediários, mensagens, permissões, concorrência, histórico e integrações.

### Agenda

A agenda precisava representar disponibilidade, bloqueios, horários especiais, feriados, meses liberados e atendimentos existentes. Também deveria oferecer visualizações diária, semanal e mensal, além de suportar conclusão, remarcação, cancelamento, encaixe e não comparecimento.

### Galeria

A galeria começou como uma vitrine de fotos e vídeos e evoluiu para uma galeria inteligente. Uma mídia pode não possuir serviço, relacionar um serviço ou representar vários serviços em ordem definida. Títulos e descrições podem ser automáticos ou personalizados, mas preços, duração, benefícios e promoções continuam vinculados ao catálogo oficial.

### Promoções

As promoções exigiram período de validade, status, serviços participantes, limite de utilização e cálculo transacional. O sistema preserva preço original, desconto e preço final no agendamento, evitando que mudanças posteriores recalcularem atendimentos antigos.

### Pix

O fluxo de Pix precisava produzir QR Code e código Copia e Cola compatíveis, incluindo CRC16, valor e TXID. O comprovante deveria ser validado, armazenado com segurança e analisado pela administração sem expor uma URL pública permanente.

### Área da Cliente

A cliente precisava consultar seus dados e atendimentos sem acessar informações de outras pessoas. Foram previstos Meu Espaço, agendamentos futuros, detalhes, histórico, remarcação, cancelamento, encaixe e configurações da conta.

### Financeiro

O financeiro deveria distinguir valor total, reserva, saldo, pagamentos parciais, pagamento final, taxas e despesas. As operações precisavam ser idempotentes para impedir duplicidade de receita.

### Experiência Diária

A experiência administrativa incorporou saudação, versículo diário estável, resumo da manhã, visão de pendências e revisão manual do encerramento. Preferências individuais permitem controlar o que cada administradora visualiza ou recebe.

---

## 3. Planejamento

O desenvolvimento foi organizado em sprints e blocos de auditoria. As entregas eram revisadas antes de novas alterações, reduzindo o risco de regressões em áreas sensíveis como autenticação, pagamentos e agenda.

### Cronologia resumida

1. **Fundação:** site institucional, serviços, autenticação, banco e estrutura de rotas.
2. **Agendamento e Pix:** disponibilidade, reserva, QR Code, comprovante e análise administrativa.
3. **Operação administrativa:** dashboard, agenda, clientes, solicitações, serviços e configurações.
4. **Financeiro e promoções:** registros transacionais, despesas, descontos e idempotência.
5. **Área da cliente:** navegação protegida, histórico, detalhes, remarcação e configurações.
6. **Notificações e automações:** central administrativa, preferências, fila e deduplicação.
7. **Experiência diária e feriados:** resumo, encerramento, funcionamento especial e no-show.
8. **Galeria inteligente:** múltiplos serviços, promoções, benefícios e agendamento direto.
9. **Acessibilidade e acabamento:** modais, drawers, foco, teclado, responsividade e textos.
10. **Performance e preparação para entrega:** lazy loading, bundle splitting, documentação, onboarding e ferramentas locais de homologação.

### Principais entregas

- Fluxo público e institucional.
- Área autenticada da cliente.
- Painel administrativo completo.
- Agendamento com múltiplos serviços.
- Reserva Pix e análise de comprovante.
- Promoções transacionais.
- Controle financeiro.
- Galeria inteligente.
- Experiência diária e automações.
- Documentação e suporte à homologação.

---

## 4. Arquitetura

### Frontend

O frontend é uma Single Page Application construída com React e React Router. As páginas são carregadas por `React.lazy`, e um boundary compartilhado apresenta skeleton durante transições ou carregamento de chunks.

Os componentes são organizados por responsabilidade: layout público, área da cliente, administração, formulários, modais, drawers e elementos reutilizáveis.

### Backend

O backend utiliza serviços gerenciados do Supabase. A aplicação acessa dados pela API do PostgreSQL, chama RPCs para operações transacionais e utiliza Edge Functions quando é necessária execução no servidor.

### Banco de dados

O PostgreSQL representa usuários relacionados, agendamentos, serviços, promoções, pagamentos, solicitações, notificações, configurações e históricos. Mudanças estruturais são versionadas por migrations SQL.

### Storage

O Supabase Storage é utilizado para mídias e comprovantes. O nível de acesso depende da finalidade: conteúdos públicos podem ser exibidos diretamente, enquanto comprovantes permanecem privados e são acessados por URL assinada.

### RPC

RPCs concentram operações que precisam de atomicidade, validação no servidor ou bloqueio concorrente. Exemplos incluem criação de agendamento promocional, revisão de pagamentos, conclusão de atendimento e atualização de relações da galeria.

### RLS

Row Level Security aplica as regras de acesso diretamente às tabelas. Isso impede que a segurança dependa exclusivamente das verificações visuais do frontend.

### Autenticação

O Supabase Auth gerencia cadastro, login, sessão, recuperação de senha e alteração segura de e-mail. Rotas protegidas separam visitantes, clientes autenticadas e administradoras.

### Edge Functions

Edge Functions executam integrações e comunicações que não devem ocorrer no navegador. Funções de lembretes, resumo diário e campanhas consomem trabalhos preparados pelas estruturas do banco.

### Fluxo geral da aplicação

```text
Visitante ou usuária
        │
        ▼
React + React Router
        │
        ├── Supabase Auth ── JWT e sessão
        ├── PostgreSQL ───── consultas protegidas por RLS
        ├── RPCs ─────────── operações transacionais
        ├── Storage ──────── mídias e comprovantes
        └── Edge Functions ─ comunicações e automações
```

---

## 5. Tecnologias

| Tecnologia | Uso no projeto |
| --- | --- |
| React 19 | Construção da interface e dos componentes |
| React Router | Navegação pública, cliente e administrativa |
| Vite 8 | Ambiente de desenvolvimento e build de produção |
| JavaScript | Linguagem principal do frontend e dos testes |
| CSS | Design responsivo, estados visuais e acessibilidade |
| Supabase | Backend gerenciado, Auth, Storage e Edge Functions |
| PostgreSQL | Persistência, políticas, funções e transações |
| Node.js Test Runner | Testes unitários e verificações estáticas |
| Playwright | Testes end-to-end e responsividade |

Embora Vitest tenha sido considerado como opção do ecossistema Vite, a suíte atual do BeautyFlow utiliza o test runner nativo do Node.js (`node:test`). Essa distinção mantém o estudo de caso fiel à implementação entregue.

---

## 6. Segurança

A segurança foi tratada em múltiplas camadas.

### RLS

As políticas RLS determinam quais registros podem ser consultados ou alterados por cada perfil. Dados de clientes, leituras de notificações e preferências individuais são isolados pela identidade autenticada.

### JWT

O JWT da sessão identifica a pessoa autenticada e permite que banco e funções validem o contexto da requisição.

### RPCs protegidas

Operações administrativas e financeiras são realizadas por RPCs com validação explícita. Permissões públicas e anônimas são removidas quando não são necessárias.

### `is_admin()`

A função central `is_admin()` reduz duplicidade de lógica e padroniza a verificação administrativa no banco.

### `SECURITY DEFINER`

Funções `SECURITY DEFINER` são utilizadas somente quando a operação precisa executar com privilégios controlados. O acesso à função continua restrito pelo papel e pelas validações internas.

### `search_path`

Funções críticas definem `search_path`, reduzindo o risco de resolução inesperada de objetos SQL.

### Ausência de `service_role` no frontend

A chave `service_role` nunca é enviada ao navegador. O frontend utiliza apenas configuração pública apropriada, enquanto secrets e permissões elevadas permanecem no ambiente servidor.

---

## 7. Performance

### Lazy Loading

Todas as páginas de rota utilizam carregamento preguiçoso. O navegador baixa o código da área acessada, em vez de carregar toda a aplicação inicialmente.

### Bundle Splitting

As áreas pública, cliente e administrativa permanecem em chunks separados. Dependências maiores, como React e Supabase, também são isoladas em bundles estáveis.

### Skeletons

Skeletons e mensagens de carregamento evitam telas brancas durante transições, consultas e recuperação de chunks.

### Code Splitting

O code splitting ocorre por rota e por dependências. Uma verificação automatizada impede que módulos administrativos ou da cliente voltem ao chunk público inicial.

### Otimização de imagens

Imagens secundárias utilizam lazy loading e decodificação assíncrona. Vídeos da galeria carregam inicialmente apenas metadados, e fallbacks preservam o layout quando uma mídia não está disponível.

---

## 8. Testes

O BeautyFlow combina testes unitários, validações específicas de Pix, E2E, verificação do bundle e auditorias técnicas.

### Unitários

Os testes unitários utilizam `node:test` e cobrem autenticação, calendário, área da cliente, notificações, promoções, financeiro, galeria, conclusão, experiência diária, segurança e ferramentas administrativas locais.

### Pix

A suíte Pix valida payload EMV, valor, TXID, CRC16, QR Code, normalização de caracteres, formatos de comprovante e ausência de credenciais privilegiadas no frontend.

### E2E

O Playwright cobre navegação pública, modais, galeria, carregamento, responsividade, ausência de overflow e proteção das rotas administrativas. Cenários destrutivos permanecem explicitamente ignorados quando poderiam alterar dados reais.

### Bundle

Uma verificação dedicada confirma que as áreas administrativa e da cliente não são incorporadas ao chunk público inicial.

### Auditorias

Foram realizadas auditorias de autenticação, migrations, segurança, código morto, duplicidades, responsividade, acessibilidade, experiência da cliente e preparação para produção.

### Quantidade final registrada

- **109 testes unitários aprovados**.
- **13 testes Pix aprovados**.
- **58 testes E2E seguros aprovados**.
- **10 cenários E2E destrutivos ignorados intencionalmente**.
- **Verificação de bundle aprovada**.
- **Lint e build de produção aprovados**.

Os números representam o estado do projeto na criação deste documento e podem aumentar conforme a evolução da suíte.

---

## 9. Principais desafios

### Galeria Inteligente

O desafio foi transformar mídias em uma vitrine comercial sem duplicar dados. A solução separou a apresentação da mídia da fonte oficial de preço, duração, benefício e promoção.

### Múltiplos serviços

Um agendamento ou resultado pode representar vários serviços com ordem, duração e valores próprios. O sistema precisava transportar a seleção completa e ainda permitir ações individuais.

### Promoções

Promoções não poderiam depender apenas do cálculo do navegador. Validade, participação, limite e incremento de uso foram levados para uma operação transacional no servidor.

### Pix

O Pix exigiu precisão no payload, validação CRC16, QR Code coerente, segurança do comprovante e separação clara entre reserva enviada, análise e aprovação.

### Experiência Diária

O conteúdo diário precisava ser estável, individual e idempotente. A mesma data e período não poderiam gerar resultados diferentes ou e-mails repetidos.

### Performance

O crescimento das áreas pública, cliente e administrativa aumentou o bundle. A solução envolveu lazy loading, chunks por rota, vendors separados e verificação automatizada.

### Segurança

O principal desafio foi equilibrar praticidade administrativa com isolamento de dados. A solução combinou Auth, JWT, RLS, RPCs protegidas e validação administrativa no banco.

---

## 10. Resultados

### Funcionalidades entregues

- Site institucional e catálogo de serviços.
- Galeria inteligente associada ao catálogo.
- Cadastro, login e recuperação de acesso.
- Agendamento com múltiplos serviços e disponibilidade.
- Reserva Pix, comprovante e análise administrativa.
- Área da cliente com histórico, detalhes e configurações.
- Cancelamento, remarcação e encaixe.
- Dashboard, agenda, clientes e solicitações.
- Serviços, promoções, financeiro e configurações.
- Feriados, conclusão, no-show e experiência diária.
- Notificações, preferências, filas e automações.
- Documentação, onboarding, homologação e feedback local.

### Resultado técnico

- Arquitetura dividida por responsabilidades.
- Banco versionado por migrations.
- Operações críticas transacionais e idempotentes.
- Segurança aplicada no banco e no servidor.
- Rotas divididas por lazy loading.
- Build de produção e bundle verificados automaticamente.

### Resultado de qualidade

- Componentes compartilhados para modais, drawers, erros e estados vazios.
- Navegação por teclado e controle de foco.
- Responsividade validada em diferentes larguras.
- Mensagens orientadas à pessoa usuária, sem exposição de erros técnicos.
- Suítes automatizadas separando cenários seguros de ações destrutivas.

---

## 11. Lições aprendidas

1. **Regra crítica deve estar no servidor.** Cálculos financeiros, promoções e permissões não podem depender somente do frontend.
2. **Idempotência precisa ser planejada.** E-mails, notificações e lançamentos financeiros devem possuir chaves de deduplicação.
3. **RLS é parte da arquitetura.** Proteção de dados não deve ser apenas uma condição visual nas páginas.
4. **Timezone precisa ser explícito.** Calendários, lembretes e resumos usam `America/Sao_Paulo` para evitar deslocamentos.
5. **Uma fonte oficial reduz inconsistências.** A galeria reutiliza dados do catálogo em vez de manter cópias comerciais.
6. **Estados intermediários são funcionalidades.** Loading, vazio, erro, pendência e expiração fazem parte da experiência real.
7. **Acessibilidade melhora a arquitetura.** Centralizar modais e drawers tornou foco, Escape e retorno de foco mais previsíveis.
8. **Testes precisam respeitar o ambiente.** Cenários que alteram dados devem ser claramente separados dos testes seguros.
9. **Documentação facilita a entrega.** Manuais, changelog, onboarding e painéis locais reduzem dependência durante a homologação.
10. **Auditorias evitam crescimento desordenado.** Revisões periódicas de duplicidade, segurança e performance preservaram a consistência da versão 1.0.

---

## 12. Próximos passos

### Versão 1.0.1

- Consolidar o feedback real de Thaís e Laysla.
- Corrigir inconsistências encontradas após o lançamento sem alterar os fluxos aprovados.
- Acompanhar erros, desempenho e comportamento em dispositivos reais.
- Revisar métricas de LCP, CLS e cache no domínio definitivo.
- Confirmar entregabilidade de e-mails e rotinas automáticas em produção.

### Versão 2.0

- Avaliar novos módulos somente após estabilização da operação da versão 1.0.
- Evoluir o catálogo com variações estruturadas de serviços.
- Considerar cursos e funcionalidades previstas no roadmap oficial.
- Reavaliar recursos de sincronização para ferramentas locais de homologação e feedback.
- Planejar novas integrações a partir de necessidades comprovadas pelo uso real.

---

Este estudo de caso descreve o estado técnico e funcional do BeautyFlow no encerramento da preparação da versão 1.0.
