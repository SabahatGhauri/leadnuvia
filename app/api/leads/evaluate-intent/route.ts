import { lazyClient } from '@/lib/lazy-client';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = lazyClient(() => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }));
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export async function POST(req: NextRequest) {
  // Validate service key authorization
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leadId, agentId, conversation } = await req.json();

    // 1. Get Agent threshold and Webhook settings
    const { data: agent } = await supabase
      .from('agents')
      .select('min_intent_score_for_cal, cal_embed_url, organization_id')
      .eq('id', agentId)
      .single();

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    // 2. Run structured AI evaluation on conversation history
    const evalResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Analyze this transcript. Return JSON with:
            - intent_score (number 0-100)
            - extracted_email (string or null)
            - summary (1 sentence summary)
            - status ("new" | "qualified" | "closed")`,
        },
        { role: 'user', content: JSON.stringify(conversation) },
      ],
    });

    const result = JSON.parse(evalResponse.choices[0].message.content || '{}');
    const { intent_score, extracted_email, summary, status } = result;

    // 3. Update Lead in Supabase
    const updatePayload: Record<string, any> = {
      intent_score: intent_score ?? 0,
      summary: summary ?? '',
      updated_at: new Date().toISOString(),
    };

    if (extracted_email) updatePayload.email = extracted_email;
    if (intent_score >= (agent.min_intent_score_for_cal || 75)) {
      updatePayload.status = 'qualified';
    }

    await supabase.from('leads').update(updatePayload).eq('id', leadId);

    // 4. Log Activity
    await supabase.from('lead_activities').insert([
      {
        lead_id: leadId,
        activity_type: 'intent_evaluated',
        details: { score: intent_score, status: updatePayload.status },
      },
    ]);

    // 5. Trigger Slack Webhook if qualified
    if (intent_score >= (agent.min_intent_score_for_cal || 75)) {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhookUrl) {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔥 *High-Intent Lead Detected!* (${intent_score}/100)\n*Email:* ${extracted_email || 'Not captured'}\n*Summary:* ${summary}`,
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      intent_score,
      isQualified: intent_score >= (agent.min_intent_score_for_cal || 75),
    });
  } catch (error: any) {
    console.error('Background Intent Eval Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
