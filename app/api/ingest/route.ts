import { lazyClient } from '@/lib/lazy-client';
import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Initialize SDKs
const firecrawl = lazyClient(() => new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! }));
const openai = lazyClient(() => new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }));
const supabase = lazyClient(() => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
));

// Allow longer execution for crawling and embedding multiple pages
export const maxDuration = 300; // 5 minutes (Vercel Pro/Enterprise limit)

interface IngestRequestBody {
  url: string;
  agentId: string;
  maxPages?: number;
}

export async function POST(req: Request) {
  try {
    const { url, agentId, maxPages = 20 }: IngestRequestBody = await req.json();

    if (!url || !agentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: url or agentId' },
        { status: 400 }
      );
    }

    // 1. Crawl Website using Firecrawl
    console.log(`Starting crawl for: ${url}`);
    const crawlResponse = await firecrawl.crawl(url, {
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
      },
    });

    if (crawlResponse.status !== 'completed') {
      return NextResponse.json(
        { error: `Firecrawl did not complete: ${crawlResponse.status}` },
        { status: 500 }
      );
    }

    const pages = crawlResponse.data;
    console.log(`Crawled ${pages.length} pages successfully.`);

    // 2. Initialize Text Splitter (500 tokens chunk size with 50 overlap)
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    let totalChunksInserted = 0;

    // 3. Process Pages & Chunk Text
    for (const page of pages) {
      const markdown = page.markdown || '';
      const sourceUrl = page.metadata?.sourceURL || url;
      const pageTitle = page.metadata?.title || 'Documentation Page';

      if (!markdown.trim()) continue;

      // Split markdown into smaller semantic chunks
      const chunks = await textSplitter.splitText(markdown);
      if (chunks.length === 0) continue;

      // 4. Generate Embeddings in Batches via OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks.map((chunk) => chunk.replace(/\n/g, ' ')),
      });

      const embeddings = embeddingResponse.data;

      // 5. Format Records for Supabase Batch Insertion
      const recordsToInsert = chunks.map((chunkText, index) => ({
        agent_id: agentId,
        source_url: sourceUrl,
        content: chunkText,
        embedding: embeddings[index].embedding,
        metadata: {
          title: pageTitle,
          chunk_index: index,
          total_chunks: chunks.length,
        },
      }));

      // 6. Delete old chunks for this source URL (prevents duplicate data on re-crawl)
      await supabase
        .from('kb_chunks')
        .delete()
        .eq('agent_id', agentId)
        .eq('source_url', sourceUrl);

      // Insert new chunks
      const { error: insertError } = await supabase
        .from('kb_chunks')
        .insert(recordsToInsert);

      if (insertError) {
        console.error(`Failed to insert chunks for ${sourceUrl}:`, insertError);
      } else {
        totalChunksInserted += recordsToInsert.length;
      }
    }

    return NextResponse.json({
      success: true,
      pagesProcessed: pages.length,
      chunksInserted: totalChunksInserted,
    });
  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during ingestion' },
      { status: 500 }
    );
  }
}
