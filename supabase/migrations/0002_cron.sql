-- =====================================================================
-- OPCIONAL — "batida do coração" do worker via pg_cron + pg_net.
-- Chama /api/cron/tick a cada minuto (processa delays, retries,
-- reprocessamento de webhooks e renovação de tokens).
-- Funciona no plano Free do Supabase; dispensa Vercel Cron.
--
-- Antes de rodar, troque:
--   https://SEU-DOMINIO  -> URL pública da app
--   SEU_CRON_SECRET      -> mesmo valor da env CRON_SECRET
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'replyflow-tick',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://SEU-DOMINIO/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET', 'Content-Type', 'application/json'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Limpeza diária de dados operacionais antigos
select cron.schedule(
  'replyflow-cleanup',
  '17 3 * * *',
  $$
  delete from public.webhook_events where created_at < now() - interval '14 days' and status in ('done','ignored');
  delete from public.jobs where created_at < now() - interval '7 days' and status in ('done','failed');
  delete from public.rate_buckets where bucket < now() - interval '2 days';
  $$
);
