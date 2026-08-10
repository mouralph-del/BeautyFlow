# Suíte de testes do Beauty Studio

## Classificação de segurança

### Seguros no ambiente atual

- `npm run test:pix`: usa configuração Pix totalmente fictícia em memória, valida BR Code, campos EMV, valor, TXID, CRC e decodifica o QR. Não lê `.env`, não imprime chave e não acessa Supabase.
- Testes de navegação/renderização em `public-safe.spec.js`: visitam páginas públicas e verificam redirecionamento de rota. Não enviam formulários nem criam dados.
- Responsividade das páginas de login, recuperação e contato nas sete resoluções definidas.

Mesmo os testes de navegação podem fazer consultas públicas de leitura ao Supabase configurado no frontend. Não executam inserts, uploads, RPCs mutáveis ou e-mails.

### Exigem homologação ou Supabase local

Cadastro, agendamento, upload de comprovante, análise administrativa, cancelamento, remarcação, encaixe, promoções, financeiro e alteração de configurações. Eles permanecem `fixme` e bloqueados, e só poderão ser implementados/executados quando:

```powershell
$env:BEAUTY_STUDIO_E2E_HOMOLOGATION="true"
$env:PLAYWRIGHT_BASE_URL="https://<AMBIENTE-DE-TESTE>"
npm run test:e2e
```

Nunca use essas variáveis apontando para o projeto oficial. E-mails devem estar desativados ou interceptados no ambiente seguro.

## Comandos

```powershell
npm run test:pix
npm run test:e2e
npm run test:e2e:ui
npm test
```

Na primeira execução do E2E, instale o navegador controlado pelo Playwright com `npx playwright install chromium`.

## Cobertura Pix

A suíte usa uma chave UUID fictícia e nunca acessa ou imprime a configuração real. O teste:

- compara a chave do campo `26.01` com a configuração fictícia esperada;
- verifica nome, cidade, valor com duas casas e TXID;
- recalcula CRC16/CCITT-FALSE;
- prova que uma alteração invalida o CRC;
- gera PNG, decodifica os pixels e compara o resultado integral com o Copia e Cola;
- procura importações de imagens estáticas antigas.

A titularidade real permanece **Pendente de confirmação no aplicativo bancário**. Consulte [o roteiro manual](../docs/17-TestePixReal.md).
