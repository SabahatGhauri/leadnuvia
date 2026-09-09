import { lazyClient } from '@/lib/lazy-client';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ChatDrawer from '@/components/ChatDrawer';
export const dynamic = 'force-dynamic';

const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export default async function EmbeddedChatPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-white overflow-hidden">
      <ChatDrawer agentConfig={agent} />
    </main>
  );
}
