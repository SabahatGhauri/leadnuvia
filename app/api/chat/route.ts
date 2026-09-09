import { lazyClient } from '@/lib/lazy-client';
import { createClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import OpenAI from 'openai';

// Force Edge runtime for low latency streaming
export const runtime = 'edge';

// Initialize OpenAI client for generating query embeddings
const openaiClient = lazyClient(() => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Initialize Supabase with Service Role to access database safely
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  agentId: string;
}

export async function POST(req: Request) {
  try {
    const { messages, agentId }: ChatRequestBody = await req.json();

    if (!agentId || !messages || !messages.length) {
      return new Response(JSON.stringify({ error: 'Missing agentId or messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'Last message must be from user' }), { status: 400 });
    }

    // 1. Generate 1536-dim vector embedding for the user's query
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: latestMessage.content.replace(/\n/g, ' '),
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Query Supabase RPC function (match_kb_chunks) for vector similarity
    const { data: matchedChunks, error: matchError } = await supabase.rpc(
      'match_kb_chunks',
      {
        query_embedding: queryEmbedding,
        target_agent_id: agentId,
        match_count: 5,
        similarity_threshold: 0.25,
      }
    );

    if (matchError) {
      console.error('Vector Search RPC Error:', matchError);
    }

    // 3. Format retrieved context and build citation sources
    let contextText = '';
    const citations: Array<{ url: string; title?: string }> = [];

    if (matchedChunks && matchedChunks.length > 0) {
      contextText = matchedChunks
        .map((chunk: { content: string; source_url: string }, idx: number) => {
          citations.push({ url: chunk.source_url });
          return `[Source ${idx + 1}]: (${chunk.source_url})\n${chunk.content}`;
        })
        .join('\n\n');
    }

    // 4. Construct System Prompt with Guardrails & Context
    const systemPrompt = `You are a helpful, accurate AI Sales & Support Assistant representing the company.

CONSTRAINTS:
- Answer questions based ONLY on the provided Context below.
- If the answer cannot be determined from the context, state politely that you do not have that information and offer to connect them with a team member.
- Keep answers concise, direct, and sales-oriented.
- Do not make up pricing, features, or guarantees not present in the context.

DOCUMENTATION CONTEXT:
${contextText || 'No relevant company documentation found for this query.'}`;

    // 5. Stream LLM Response using Vercel AI SDK
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      // Pass retrieved sources in response header metadata for client UI rendering
      headers: {
        'x-citations-json': JSON.stringify(citations),
      },
    });

    return result.toTextStreamResponse({ headers: { 'x-citations-json': JSON.stringify(citations) } });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
