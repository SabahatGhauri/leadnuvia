import { lazyClient } from '@/lib/lazy-client';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { sendHighIntentSlackAlert } from '@/lib/slack';

const openai = lazyClient(() => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }));
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export async function POST(req: Request) {
  try {
    const { leadId, conversationId, agentId } = await req.json();

    // 1. Retrieve recent messages from session
    const { data: messages } = await supabase
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: false, reason: 'No messages found' });
    }

    const transcript = messages.map((m) => `${m.sender}: ${m.content}`).join('\n');

    // 2. Score conversation with OpenAI
    const evalCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Analyze the user transcript and output a JSON object with:
          - "score": integer 0-100 indicating buyer intent (questions about enterprise tier, pricing, integrations, demo = +30)
          - "summary": 1-2 sentence overview of user interest
          - "email": extracted email address or null`,
        },
        { role: 'user', content: transcript },
      ],
    });

    const parsedResult = JSON.parse(evalCompletion.choices[0].message.content || '{}');
    const intentScore = parsedResult.score || 0;
    const summary = parsedResult.summary || 'Visitor browsing site...';

    // 3. Fetch agent configuration & organization Slack Webhook URL
    const { data: agent } = await supabase
      .from('agents')
      .select('name, organization_id')
      .eq('id', agentId)
      .single();

    // 4. Update Lead Record in Supabase
    const { data: lead } = await supabase
      .from('leads')
      .update({
        intent_score: intentScore,
        email: parsedResult.email || undefined,
      })
      .eq('id', leadId)
      .select()
      .single();

    // 5. Fire Slack Alert if intent score > 80
    if (intentScore >= 80) {
      // Check if we have already alerted for this session to avoid spam
      const { data: existingAlert } = await supabase
        .from('lead_activities')
        .select('id')
        .eq('lead_id', leadId)
        .eq('activity_type', 'slack_notified')
        .maybeSingle();

      if (!existingAlert) {
        // Retrieve Organization Webhook Config
        const SLACK_WEBHOOK_URL = process.env.SLACK_INCOMING_WEBHOOK_URL;

        if (SLACK_WEBHOOK_URL) {
          await sendHighIntentSlackAlert(SLACK_WEBHOOK_URL, {
            email: lead?.email,
            company: lead?.company_name,
            intentScore,
            summary,
            agentName: agent?.name,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads`,
          });

          // Record audit log entry
          await supabase.from('lead_activities').insert({
            lead_id: leadId,
            activity_type: 'slack_notified',
            details: { score: intentScore },
          });
        }
      }
    }

    return NextResponse.json({ success: true, score: intentScore, summary });
  } catch (error: any) {
    console.error('Intent evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
