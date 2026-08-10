# 02 — Arquitetura

O repositório reúne o frontend React/Vite e os artefatos de backend (`supabase/migrations` e `supabase/functions`). Eles são versionados juntos, mas executam em ambientes diferentes: navegador, PostgreSQL gerenciado e runtime Deno das Edge Functions.

```mermaid
flowchart TD
    U[Visitante ou cliente] --> FE[React + Vite]
    A[Administradora] --> FE
    FE --> AUTH[Supabase Auth]
    FE --> API[Data API com RLS]
    FE --> RPC[RPCs PostgreSQL]
    FE --> ST[Supabase Storage]
    FE --> EF[Edge Functions]
    API --> DB[(PostgreSQL)]
    RPC --> DB
    ST --> DB
    DB --> CRON[pg_cron]
    CRON --> NET[pg_net]
    NET --> EF
    EF --> DB
    EF --> RESEND[Resend]
```

## Escolha do caminho

- **Acesso direto:** consultas e CRUD simples, como catálogo, galeria e telas administrativas, passam pela API do Supabase e dependem de RLS.
- **RPC:** operações atômicas ou com regras, como criar agendamento, revisar pagamento, responder remarcação, liberar agenda e registrar finanças.
- **Edge Function:** envio de e-mail, uso de `service_role` e processamento da fila. O frontend nunca recebe essa chave.
- **Storage:** galeria e promoções usam buckets públicos; comprovantes usam bucket privado e URL assinada para administradores.

```mermaid
sequenceDiagram
    participant UI as React
    participant Auth as Supabase Auth
    participant DB as PostgreSQL/RPC
    participant Edge as Edge Function
    participant Mail as Resend
    UI->>Auth: sessão/JWT
    UI->>DB: operação com JWT
    DB-->>UI: resultado validado
    UI->>Edge: ação que exige e-mail
    Edge->>DB: acesso servidor
    Edge->>Mail: entrega
```

Essa estrutura reduz infraestrutura própria e mantém schema, autorização e automações auditáveis em migrations. O custo é exigir cuidado com RLS, grants, secrets e compatibilidade entre frontend e banco.
