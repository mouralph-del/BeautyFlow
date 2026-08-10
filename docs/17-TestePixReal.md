# 17 — Teste manual do Pix real

Este roteiro confirma o titular consultado pela instituição financeira sem efetuar transferência. Não registre a chave completa, dados bancários ou capturas do aplicativo.

> **Importante:** o texto `VITE_PIX_RECEIVER_NAME` não prova quem é o titular. A confirmação real é o nome apresentado pelo aplicativo bancário depois que ele consulta a chave Pix.

## Pré-condições

- Use somente Supabase local ou homologação confirmada e isolada.
- Use um agendamento claramente identificado como teste.
- Não utilize comprovante, conta ou dados pessoais reais na automação.
- Garanta que e-mails externos estejam desativados.

## Roteiro

1. Crie um agendamento de teste.
2. Avance até o `PaymentStep`.
3. Confira se o valor exibido corresponde à soma das taxas de reserva.
4. Confirme que o Copia e Cola e o QR Code estão visíveis.
5. Escaneie o QR Code em um aplicativo bancário confiável.
6. **Não confirme o pagamento.**
7. Confira o nome real do titular apresentado pelo banco. O esperado é o titular da chave Pix da Thaís.
8. Confira também a instituição destinatária e o valor.
9. Se o titular, a instituição ou o valor forem diferentes do esperado, interrompa imediatamente e não pague.
10. Registre somente `titular correto` ou `titular incorreto`. Não registre nome, chave, instituição detalhada ou screenshot.
11. Cancele a operação antes da confirmação bancária.

## Registro permitido

| Verificação | Resultado |
| --- | --- |
| Titular | Pendente de confirmação no aplicativo bancário |
| Instituição | Pendente, sem registrar o nome no Git |
| Valor da reserva | Pendente |
| QR e Copia e Cola equivalentes | Validado automaticamente pela suíte |
| Transferência realizada | Não |

Nunca adicione screenshots bancárias, comprovantes reais ou arquivos `.env` ao Git.
