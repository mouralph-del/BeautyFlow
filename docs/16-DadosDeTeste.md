# Dados de teste da Sprint Final

Os scripts em `supabase/test-data` são manuais, idempotentes e bloqueados por padrão. Eles não fazem parte das migrations e não são executados em produção.

## Proteção obrigatória

Use somente um projeto local ou de homologação confirmado. Na mesma sessão SQL, habilite explicitamente:

```sql
set beauty_studio.seed_mode = 'test';
```

Em seguida execute `seed_final_sprint.sql`. Sem essa variável, o script interrompe antes de inserir registros. Os contatos usam o domínio reservado `.invalid`, os telefones são fictícios, campanhas de e-mail ficam desativadas e todos os nomes/notas começam com `[TESTE]` ou `[TESTE FINAL SPRINT]`.

## Registros criados

- Pagamento em análise, remarcação pendente e cancelamento recente.
- Encaixe pendente.
- Promoções ativa, agendada, pausada e encerrada.
- Atendimentos fictícios para reserva, pagamento total, parcial, saldo, taxa de maquininha, cancelamento e não comparecimento.
- Cinco transações financeiras e uma despesa fictícia.

Os UUIDs usam prefixos reservados de `f1000000` a `f6000000`, permitindo identificação e remoção sem atingir dados reais.

## Remoção

Depois da validação, mantenha `beauty_studio.seed_mode = 'test'` na mesma sessão e execute `cleanup_final_sprint.sql`. A limpeza remove primeiro logs/fila e registros dependentes, depois solicitações e appointments. Confira os relatórios antes e depois.

Nunca execute ações de aprovação, recusa, encerramento ou exclusão sem conferir o marcador `[TESTE]` e a confirmação da própria interface. O seed prepara os cenários; a execução manual completa das ações permanece responsabilidade do ambiente de teste autenticado.
