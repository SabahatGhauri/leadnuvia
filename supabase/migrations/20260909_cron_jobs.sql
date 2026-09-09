SQL
-- Schedule 1: Clear stale leads every Sunday at 02:00 AM UTC
SELECT cron.schedule(
  'cleanup-stale-leads-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/scheduled-tasks?action=clean-stale-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

-- Schedule 2: Aggregate daily metrics every day at 00:05 AM UTC
SELECT cron.schedule(
  'aggregate-daily-metrics',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/scheduled-tasks?action=aggregate-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);
Show how to trigger an asynchronous background evaluation route after the SSE stream completes to evaluate lead intent.
Here is how to trigger an asynchronous background evaluation route using Next.js after() (or Edge waitUntil) right when the SSE stream finishes, allowing you to run AI intent scoring and trigger integrations (Slack/Cal.com) without blocking the client response.
