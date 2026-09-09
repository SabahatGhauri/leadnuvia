import { lazyClient } from '@/lib/lazy-client';
import { createClient } from '@supabase/supabase-js';
import MetricsChart, { DailyMetric } from '@/components/MetricsChart';
export const dynamic = 'force-dynamic';

const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export default async function AnalyticsPage() {
  // Fetch last 30 days of metrics
  const { data } = await supabase
    .from('daily_metrics')
    .select('*')
    .order('metric_date', { ascending: true })
    .limit(30);

  const metrics: DailyMetric[] = data || [];

  return (
    <main className="p-8 bg-slate-950 min-h-screen">
      <MetricsChart data={metrics} />
    </main>
  );
}
