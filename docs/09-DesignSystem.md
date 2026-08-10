# 09 — Design system

## Padrão de dialogs e drawers — Sprint 3

Diálogos centrais reutilizam `src/components/Modal/Modal.jsx`, com nome e descrição acessíveis, foco inicial, focus trap, Escape configurável, retorno de foco, bloqueio de scroll, overlay e movimento reduzido. A interface não usa `alert()` ou `confirm()` nativos.

Drawers permanecem laterais e usam `useAccessibleDrawer`: Tab/Shift+Tab contidos, Escape, retorno de foco e restauração do scroll. Cada drawer possui `aria-labelledby`, botão fechar nomeado e backdrop que bloqueia o fundo.

Os novos cards reutilizam papel branco, bege, cobre e serifas do painel. Até 768px formam uma coluna; em celular o modal ocupa a viewport, tem rolagem interna, números legíveis e botões em largura completa.

O projeto usa CSS por página/componente e variáveis no painel, sem biblioteca de design central. Os valores abaixo foram extraídos dos CSS atuais.

## Fundamentos visuais

| Uso | Valor confirmado |
| --- | --- |
| Fundo público | `#FAF7F2` |
| Texto público | `#2F2926` |
| Fundo admin | `#f8f4ef` |
| Papel/card admin | `#fffdfb` |
| Borda admin | `#eadbd0` |
| Marrom admin | `#38271f` |
| Cobre/ação admin | `#a66d48` e, em componentes, `#9a6543` |
| Texto secundário | `#7c6e65` |
| Sucesso | fundos como `#eaf6ee`/`#eef8f0`, texto `#36704a`/`#2f6f42` |
| Erro/cancelado | fundos como `#fae9e7`/`#fff0ee`, texto `#9a4943`/`#963f37` |
| Atenção/análise | `#fff4dc`, `#fff0c9`, textos marrons/dourados |

Poppins é a fonte base global. Títulos e destaques usam Georgia/Times para um tom editorial. Cards normalmente têm fundo branco/quase branco, borda bege, raio de 12–20 px e sombras suaves; overlays/modal usam sombras mais profundas. Botões primários são marrons/cobre com texto branco; secundários usam fundo claro e borda bege.

Inputs mantêm fonte herdada, fundo branco, borda bege e raio aproximado de 9–13 px. Modais centralizam conteúdo sobre overlay escuro translúcido; drawers entram pela direita. Tabelas têm divisórias claras e wrapper com rolagem horizontal. Mensagens de sucesso/erro combinam cor, texto e contexto — não dependem apenas da cor.

O espaçamento é responsivo e recorrente em múltiplos de aproximadamente 4–8 px, com cartões em torno de 18–30 px. Breakpoints encontrados incluem 1100, 1000, 860, 620 e 600 px. Grades viram uma coluna, sidebar vira drawer e modais podem ocupar a tela inteira no celular.

`prefers-reduced-motion: reduce` remove transições do painel e animação do drawer da agenda. Novos movimentos devem aderir ao mesmo padrão.

## Componentes e estados

- Cards: borda `#eadbd0`, papel `#fffdfb`, raio arredondado e sombra discreta.
- Botões: ação principal sólida; ação secundária contornada; perigo em vermelho terroso.
- Tabelas: títulos pequenos, linhas separadas e status em pills.
- Agenda: confirmado verde, análise amarelo, concluído azul, cancelado vermelho, bloqueio cinza e encaixe lilás.
- Feedback: mensagens curtas próximas à ação; loading desabilita controles quando necessário.

## Tom de voz

Acolhedor, claro, profissional e delicado, sempre em português e sem jargão para clientes. Exemplos reais: “Recebemos seu comprovante.”, “Agendamento confirmado” e “Carregando painel...”. Textos públicos devem usar Beauty Studio, nunca BeautyFlow.

## E-mails

O padrão oficial versionado usa fundo bege, cartão branco, botão marrom, linguagem em português e assinatura **Thaís Santos Beauty Studio**. O helper renderiza o conteúdo de `email_templates`; alterações precisam preservar legibilidade e variáveis obrigatórias.

## Experiência da cliente

O drawer e os cards seguem a paleta bege e marrom, tipografia editorial, bordas arredondadas e sombras suaves do Beauty Studio. Há foco visível, navegação por teclado, adaptação móvel e respeito a `prefers-reduced-motion`.

## Estados de carregamento e operação

Rotas lazy usam indicador pequeno em tons da marca. Modais de conclusão, ausência e feriados seguem cards claros, bordas arredondadas e mensagens explícitas.

O fallback central de rota utiliza skeletons para preservar espaço e evitar tela branca. Em falha de chunk, apresenta “Não foi possível carregar esta página.” com as ações “Tentar novamente” e “Voltar ao início”; em telas pequenas, as ações ocupam a largura disponível.

### Atualizações Sprint 2

- Sistema de skeletons padronizado: `src/components/Skeleton` com classes e comportamento consistente (cores da marca, animação discreta e `prefers-reduced-motion`).
- Toaster padronizado com `ToastProvider` para garantir título, mensagem, ícone e tempo uniforme.
- Avatares e imagens usam componentes com fallback para evitar imagens quebradas e preservar layout durante carregamento.
