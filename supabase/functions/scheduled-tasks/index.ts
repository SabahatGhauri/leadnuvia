TypeScript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Verify Cron / Service authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'clean-stale-leads') {
      // 1. Delete or archive leads inactive for more than 30 days without contact info
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .delete()
        .is('email', null)
        .lt('created_at', thirtyDaysAgo)
        .select('id');

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, action, cleanedCount: data?.length || 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'aggregate-metrics') {
      // 2. Aggregate yesterday's metrics for all organizations
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: orgs, error: orgError } = await supabase.from('organizations').select('id');
      if (orgError) throw orgError;

      const metricRecords = [];

      for (const org of orgs || []) {
        // Fetch lead counts for yesterday
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('created_at', `${yesterday}T00:00:00Z`)
          .lte('created_at', `${yesterday}T23:59:59Z`);

        const { count: qualifiedLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('status', 'qualified')
          .gte('created_at', `${yesterday}T00:00:00Z`)
          .lte('created_at', `${yesterday}T23:59:59Z`);

        const total = totalLeads || 0;
        const qualified = qualifiedLeads || 0;
        const rate = total > 0 ? Number(((qualified / total) * 100).toFixed(2)) : 0;

        metricRecords.push({
          organization_id: org.id,
          metric_date: yesterday,
          total_leads: total,
          qualified_leads: qualified,
          conversion_rate: rate,
        });
      }

      // Upsert metrics records
      const { error: upsertError } = await supabase
        .from('daily_metrics')
        .upsert(metricRecords, { onConflict: 'organization_id,metric_date' });

      if (upsertError) throw upsertError;

      return new Response(
        JSON.stringify({ success: true, action, date: yesterday, processedOrgs: metricRecords.length }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action parameter' }), { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
