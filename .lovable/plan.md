

# Correção: Cron Job com vault.decrypted_secrets

## Problema
O cron job atual tem o CRON_SECRET hardcoded em texto claro no SQL command.

## Solução
1. Remover o cron job atual (`coach-weekly-checkin`)
2. Recriar usando `vault.decrypted_secrets` para buscar o secret dinamicamente

## SQL a executar (migração)

```sql
-- Remover job atual com secret exposto
SELECT cron.unschedule('coach-weekly-checkin');

-- Recriar usando vault para não expor secret
SELECT cron.schedule(
  'coach-weekly-checkin',
  '0 23 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://fbsuhhmuwkqzpslonlxt.supabase.co/functions/v1/personal-coach',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"type": "weekly"}'::jsonb
  );
  $$
);
```

## O que NÃO muda
- Continua sendo **apenas um** cron job (weekly)
- A função `personal-coach` detecta internamente se é o último domingo e trata como mensal
- Nenhum `coach-monthly-checkin` será criado

## Arquivos modificados
Apenas uma migração SQL. Nenhum arquivo de código alterado.

