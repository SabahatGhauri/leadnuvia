'use server';
import { lazyClient } from '@/lib/lazy-client';

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role to ensure admin privileges
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface LeadWithTranscript {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  intentScore: number;
  status: 'new' | 'qualified' | 'contacted' | 'closed_won' | 'closed_lost';
  lastActive: string;
  summary: string;
  messages: Message[];
}

/**
 * Fetches all leads for a given organization alongside their latest session transcript
 */
export async function getDashboardLeads(organizationId: string): Promise<LeadWithTranscript[]> {
  try {
    // 1. Fetch leads sorted by highest intent and newest activity
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        email,
        name,
        company_name,
        intent_score,
        status,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('intent_score', { ascending: false })
      .order('updated_at', { ascending: false });

    if (leadsError || !leads) {
      console.error('Error fetching leads:', leadsError);
      return [];
    }

    // 2. Fetch conversations and transcripts for each lead
    const leadPromises = leads.map(async (lead) => {
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          id,
          summary,
          updated_at,
          messages (
            id,
            sender,
            content,
            created_at
          )
        `)
        .eq('lead_id', lead.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Format timestamp relative date
      const lastActiveDate = new Date(lead.updated_at);
      const timeAgo = getTimeAgo(lastActiveDate);

      // Parse messages inside the conversation
      const rawMessages = convData?.messages || [];
      const formattedMessages: Message[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

      return {
        id: lead.id,
        email: lead.email,
        name: lead.name,
        company: lead.company_name,
        intentScore: lead.intent_score || 0,
        status: lead.status || 'new',
        lastActive: timeAgo,
        summary: convData?.summary || 'No conversation summary recorded yet.',
        messages: formattedMessages,
      };
    });

    return await Promise.all(leadPromises);
  } catch (error) {
    console.error('Server Action Error:', error);
    return [];
  }
}

// Simple time-ago helper
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
