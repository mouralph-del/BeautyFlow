# 01 — Projeto

## Identidade e contexto

**BeautyFlow** é o nome técnico interno do repositório. **Beauty Studio** é a marca pública do produto e **Thaís Santos Beauty Studio** identifica o cliente inicial e a assinatura institucional.

O sistema resolve a fragmentação entre apresentação do estúdio, atendimento às clientes, agenda, pagamento de reserva e operação administrativa. O público inclui visitantes, clientes autenticadas e administradoras.

> O Beauty Studio foi desenvolvido para oferecer uma experiência simples, acolhedora e organizada, tanto para a profissional quanto para suas clientes. As funcionalidades priorizam facilidade de uso, segurança dos dados e comunicação clara.

## Objetivos e escopo 1.0

- Apresentar história, serviços, galeria e contato.
- Permitir cadastro, login, recuperação de senha e área da cliente.
- Criar agendamentos com múltiplos serviços e calcular disponibilidade.
- Receber comprovante Pix e submeter a confirmação manual.
- Oferecer cancelamento, remarcação e encaixe com regras no banco.
- Administrar agenda, solicitações, clientes, catálogo, promoções, financeiro e configurações.
- Automatizar notificações, lembretes, campanhas e resumo diário.

A filosofia é manter ações críticas transacionais no PostgreSQL, autorização com Auth/RLS e tarefas privilegiadas nas Edge Functions. Cursos e variações de cílios são [Roadmap](11-Roadmap.md), não escopo atual.

## Cuidados de evolução

O frontend não é a fonte de verdade para conflitos, permissões ou valores financeiros. Mudanças devem preservar migrations, histórico de serviços pausados, políticas versionadas, idempotência e separação entre configurações públicas e privadas.
