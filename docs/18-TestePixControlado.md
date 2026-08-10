# Teste Pix controlado

Este roteiro prepara o teste, mas não autoriza o Codex a realizar transferência bancária. A migration `20260804100000_admin_payment_review_email.sql` precisa ser revisada e aplicada antes de esperar o aviso administrativo; ela não é executada por este roteiro automaticamente.

## Estado antes do teste

- O secret `THAIS_ADMIN_EMAIL` existe, mas o Supabase não permite recuperar seu valor. O destino esperado, mascarado, é `m******h@gmail.com`; a correspondência exata deve ser confirmada no Dashboard ou redefinida conscientemente antes do teste.
- QR e Copia e Cola já são validados pela suíte `npm run test:pix`.
- Titularidade: **Pendente de confirmação no aplicativo bancário.**

## Preparação do agendamento

1. Defina um identificador único no formato `PIXTEST-AAAAMMDD-HHMM`.
2. Entre no site com a conta controlada de teste.
3. Escolha um serviço ativo e um horário realmente disponível.
4. Use o nome `Cliente Teste Pix`.
5. Use o e-mail controlado informado para o teste, sem gravá-lo no código.
6. Use um telefone fictício reservado para teste e aceito pela validação, por exemplo `(00) 90000-0000`.
7. Em observações, registre exatamente `[TESTE PIX CONTROLADO:<IDENTIFICADOR>]`.
8. Confira que a taxa foi calculada pelo catálogo; não edite chave ou valor.

## Antes de transferir

1. Abra o QR Code ou copie o código Pix.
2. Cole ou escaneie em um aplicativo bancário.
3. Confira o nome real do recebedor antes de pagar.
4. Confira o valor contra a taxa exibida no Beauty Studio.
5. Se o titular não for o esperado, interrompa e não realize o pagamento.
6. Realize a transferência somente após autorização da Thaís.
7. Guarde o comprovante apenas para o envio no formulário.
8. Não salve prints bancários no Git.

O valor configurado em `VITE_PIX_RECEIVER_NAME` não comprova a titularidade da chave.

## Depois do envio

Confirme `/admin/solicitacoes?tab=pagamentos`, URL assinada do comprovante, status `em_analise`, notificação e outbox. Antes de aprovar ou recusar, confira o marcador do teste. Aprovação deve gerar uma única transação de reserva; recusa exige motivo e não pode ser repetida.

## Limpeza opcional

Não execute antes de analisar o resultado. Remova o arquivo pelo Storage autenticado como admin; depois, na mesma sessão SQL:

```sql
set beauty_studio.pix_test_run_id = 'PIXTEST-AAAAMMDD-HHMM';
```

Execute `supabase/test-data/cleanup_controlled_pix_test.sql`. O script só seleciona o nome e a observação exatos, não exclui a conta Auth, configurações ou registros sem vínculo ao teste.
