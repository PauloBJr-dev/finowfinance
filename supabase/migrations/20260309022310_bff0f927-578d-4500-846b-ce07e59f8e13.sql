
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
