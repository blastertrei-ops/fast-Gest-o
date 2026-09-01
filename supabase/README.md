# Migração paralela para Supabase

Este diretório prepara o banco novo sem alterar o Firebase em produção. O Firebase só será desativado depois de uma validação de contagens, amostras e fluxos essenciais.

## Ordem segura

1. Aplique `migrations/202609010001_initial_tenant_schema.sql` no SQL Editor do projeto **fast-gestao-migracao**.
2. Gere uma exportação privada do Firestore, fora do repositório: `npm run supabase:export-firestore -- --output=C:\\backup\\fast-gestao-firestore.json`.
3. Valide a exportação antes de importar. Ela contém hashes de senha e dados de clientes; nunca a envie ao GitHub.
4. Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` disponíveis apenas em ambiente seguro, importe: `npm run supabase:import -- --input=C:\\backup\\fast-gestao-firestore.json`.
5. Compare as contagens por coleção e empresa.
6. Só então o backend passa a usar Supabase em ambiente de teste. A produção permanece no Firebase até a aprovação final.

## Segurança

As tabelas usam `company_id` e RLS. Não exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend e não a registre em logs. O aplicativo continuará acessando o banco pelo servidor; isso preserva as permissões já aplicadas à API.
