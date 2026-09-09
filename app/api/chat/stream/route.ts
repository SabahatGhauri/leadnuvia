import { lazyClient } from '@/lib/lazy-client';
import { NextRequest, NextResponse, after } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = lazyClient(() => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }));
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

export const runtime = 'nodejs'; // Required for Next.js after() API

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, leadId } = await req.json();

    // 1. Fetch agent system prompt
    const { data: agent } = await supabase
      .from('agents')
      .select('system_prompt')
      .eq('id', agentId)
      .single();

    const systemPrompt = agent?.system_prompt || 'You are a helpful sales assistant.';

    // 2. Request stream from OpenAI
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    });

    let fullAssistantResponse = '';

    // 3. Create readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const chunk of openaiResponse) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullAssistantResponse += content;
            const sseEvent = `data: ${JSON.stringify({ text: content })}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    // 4. Trigger background evaluation AFTER the stream completes
    after(async () => {
      if (!leadId) return;

      const updatedHistory = [
        ...messages,
        { role: 'assistant', content: fullAssistantResponse },
      ];

      // Trigger background intent evaluation route via internal HTTP call
      const appHost = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${appHost}/api/leads/evaluate-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ leadId, agentId, conversation: updatedHistory }),
      }).catch((err) => console.error('Failed to trigger background evaluation:', err));
    });

    // 5. Return SSE response immediately
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
