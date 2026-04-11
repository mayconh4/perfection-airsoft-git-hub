-- ============================================================
-- MIGRATION: Agendamento diário da cotação do dólar
-- Executa todo dia às 09:00 horário de Brasília (12:00 UTC)
-- ============================================================

-- Habilita extensões necessárias (já disponíveis no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job antigo se existir
SELECT cron.unschedule('update-dollar-rate-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-dollar-rate-daily'
);

-- Agenda: todo dia 09:00 BRT (= 12:00 UTC)
SELECT cron.schedule(
  'update-dollar-rate-daily',
  '0 12 * * *',
  $$
    SELECT net.http_post(
      url     := (SELECT value FROM app_settings WHERE key = 'supabase_url' LIMIT 1)
                 || '/functions/v1/update-dollar-rate',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          SELECT value FROM app_settings WHERE key = 'service_role_key' LIMIT 1
        )
      ),
      body    := '{}'::jsonb
    );
  $$
);
