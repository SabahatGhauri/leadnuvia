-- Enable cron and HTTP request extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Table to store pre-aggregated metrics
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_leads INT DEFAULT 0,
  qualified_leads INT DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

-- Enable RLS on metrics
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view metrics"
ON public.daily_metrics FOR SELECT
USING (public.is_org_member(organization_id));
