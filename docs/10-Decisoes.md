# 10 — Decisões

## Decisão — Experiência diária

Encerramento é sempre manual; preferência de e-mail de encerramento nasce desativada. Versículos usam pequenos trechos da Almeida 1819 (tradução histórica em domínio público), com escolha determinística registrada por data/período.

## Decisão 001 — Nome público e nome interno

**Contexto:** produto e código têm públicos diferentes.  
**Decisão:** BeautyFlow permanece técnico; Beauty Studio/Thaís Santos Beauty Studio aparece para clientes e na documentação.  
**Motivo:** preservar continuidade técnica e marca adequada.  
**Consequências:** nomes de jobs, pacote e Vault podem manter BeautyFlow; textos públicos não.

## Decisão 002 — Supabase como backend

**Contexto:** o produto exige dados, identidade, arquivos e tarefas de servidor.  
**Decisão:** usar Supabase Auth, PostgreSQL, RLS, Storage, RPCs, Edge Functions, cron e Vault.  
**Motivo:** concentrar infraestrutura e regras transacionais.  
**Consequências:** migrations e políticas são críticas; secrets ficam fora do Vite.

## Decisão 003 — Monorepositório

**Contexto:** frontend e backend evoluem juntos.  
**Decisão:** versionar React e artefatos Supabase no BeautyFlow.  
**Motivo:** rastrear contratos e deploy em conjunto.  
**Consequências:** executam separadamente, apesar de compartilharem repositório.

## Decisão 004 — Pix com confirmação manual

**Contexto:** a reserva precisa de pagamento antes da confirmação.  
**Decisão:** receber comprovante em Storage privado e submetê-lo à administradora.  
**Motivo:** fluxo inicial viável sem conciliação bancária automática.  
**Consequências:** existe estado `em_analise`, fila administrativa e comunicação de aprovação/recusa.

## Decisão 005 — Taxa não reembolsável e cancelamento automático

**Contexto:** o horário reservado tem custo de oportunidade.  
**Decisão:** política versionada informa não reembolso; cancelamento válido libera o slot imediatamente.  
**Motivo:** tornar a regra clara e reutilizar a agenda.  
**Consequências:** mudanças exigem nova versão da política e revisão jurídica/operacional.

## Decisão 006 — Preservar horário na remarcação

**Contexto:** um pedido pode ser recusado ou conflitar.  
**Decisão:** manter appointment original até a aceitação e validação do novo horário.  
**Motivo:** não deixar a cliente sem atendimento.  
**Consequências:** pedido e appointment têm ciclos separados.

## Decisão 007 — Encaixe não bloqueia antes da aceitação

**Contexto:** solicitações expressam preferência, não compromisso.  
**Decisão:** só criar reserva após proposta aceita, válida e conferida.  
**Motivo:** evitar bloqueios especulativos.  
**Consequências:** conflitos podem exigir reanálise.

## Decisão 008 — Liberação mensal pela administradora

**Contexto:** a agenda futura depende da disponibilidade profissional.  
**Decisão:** meses passam por revisão e liberação explícita.  
**Motivo:** evitar oferta automática incorreta.  
**Consequências:** cron apenas lembra; não substitui a decisão administrativa.

## Decisão 009 — Preservar serviços históricos

**Contexto:** appointments guardam histórico e snapshots.  
**Decisão:** pausar serviços vinculados em vez de excluí-los.  
**Motivo:** preservar relatórios e rastreabilidade.  
**Consequências:** catálogo público filtra ativos.

## Decisão 010 — Storage privado para comprovantes

**Contexto:** comprovantes podem conter dados sensíveis.  
**Decisão:** bucket privado e signed URL temporária para admin.  
**Motivo:** minimizar exposição.  
**Consequências:** acesso depende de política e sessão.

## Decisão 011 — Configurações centralizadas e versionadas

**Contexto:** horários, textos e políticas mudam sem alteração de tela.  
**Decisão:** settings JSON, templates/preferências e versões de políticas no banco.  
**Motivo:** operação administrativa com auditoria.  
**Consequências:** separar rigorosamente dados públicos e privados.

## Decisão 012 — Cursos e variações para 2.0

**Contexto:** esses módulos exigem novos modelos e fluxos.  
**Decisão:** não incluí-los na 1.0.  
**Motivo:** concluir e estabilizar o núcleo atual.  
**Consequências:** qualquer menção atual deve estar marcada como Roadmap.
# Decisões de autenticação e administração

“As sessões são mantidas somente durante a sessão do navegador. A opção lembrar conta armazena apenas o e-mail, enquanto a senha é gerenciada pelo navegador.”

“Thaís e Laysla são administradoras com as mesmas permissões. Somente Thaís recebe e-mails administrativos por padrão.” A diferenciação é uma preferência individual de comunicação, não um nível de acesso.

## Decisões da versão 1.0

Conclusão nunca é automática; cada atendimento exige revisão. Feriados não bloqueiam a agenda sem decisão. Não comparecimento preserva valores recebidos e nunca cria receita restante fictícia.
