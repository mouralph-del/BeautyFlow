# Como contribuir

O diretório oficial é `C:\Projetos\BeautyFlow`. Nunca use uma cópia do OneDrive como origem, comparação ou destino de sincronização.

1. Crie uma branch específica e mantenha cada alteração pequena e revisável.
2. Preserve “BeautyFlow” para nomes técnicos e use “Beauty Studio” ou “Thaís Santos Beauty Studio” nos textos públicos.
3. Crie uma nova migration para qualquer mudança no banco. Nunca edite diretamente o banco de produção nem apague migrations aplicadas sem reparar o histórico.
4. Mantenha RLS e validações no servidor. Não coloque `service_role`, tokens, Pix ou dados pessoais no frontend.
5. Não versione `.env`; documente somente nomes de variáveis e use secrets do Supabase.
6. Execute `npm run lint`, `npm run build` e, quando o Supabase CLI estiver configurado, `npx supabase db lint`.
7. Teste o fluxo afetado nos perfis visitante, cliente e administrador, conforme aplicável.
8. Atualize README, documentação, matriz de testes e changelog.

Pull requests devem explicar objetivo, impacto, migrations, evidências de teste e cuidados de deploy. Arquivos gerados, dados reais e credenciais não devem ser incluídos.
