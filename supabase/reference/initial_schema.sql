-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Organizations / Accounts (SaaS Customer Accounts)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
    plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'business'))
);

-- 3. AI Agents / Widget Configurations
CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT DEFAULT 'AI Assistant' NOT NULL,
    allowed_domains TEXT[] DEFAULT '{}'::TEXT[] NOT NULL, -- CORS / Domain security
    system_prompt TEXT DEFAULT 'You are a helpful sales assistant. Answer questions based on provided context.',

    -- Widget Customization Options
    primary_color TEXT DEFAULT '#4F46E5',
    greeting_message TEXT DEFAULT 'Hi there! How can I help you today?',
    logo_url TEXT,
    cal_embed_url TEXT, -- In-chat booking link (e.g. Cal.com / Calendly)

    -- Lead Trigger Rules
    scoring_threshold INT DEFAULT 70, -- Threshold to prompt email/meeting
    notify_email TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 4. Knowledge Base Chunks (RAG Vector Store)
CREATE TABLE public.kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    source_url TEXT NOT NULL, -- Page URL where chunk was scraped
    content TEXT NOT NULL, -- Plain text chunk
    embedding vector(1536), -- Vector embedding (1536 for OpenAI text-embedding-3-small)
    metadata JSONB DEFAULT '{}'::jsonb -- Page title, headers, chunk index, etc.
);

-- Index for HNSW Vector Similarity Search
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks
USING hnsw (embedding vector_cosine_ops);

-- 5. Leads (Captured Visitors)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    email TEXT,
    name TEXT,
    company_name TEXT,
    job_title TEXT,
    intent_score INT DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'contacted', 'closed_won', 'closed_lost')),

    -- Reverse IP / Enrichment Data (For future visitor ID integrations)
    ip_address INET,
    enrichment_data JSONB DEFAULT '{}'::jsonb
);

-- 6. Chat Conversations (Sessions)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL, -- Nullable until captured
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    session_token TEXT UNIQUE NOT NULL, -- Persistent cookie/localStorage token

    -- Metadata & Analytics
    current_intent_score INT DEFAULT 0,
    summary TEXT, -- LLM-generated summary of session
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(5)
);

-- 7. Chat Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- AI Citations & Intent Breakdown
    citations JSONB DEFAULT '[]'::jsonb, -- Store list of source URLs referenced
    intent_evaluation JSONB DEFAULT '{}'::jsonb -- LLM output: { score_delta: +15, reasoning: "Asked about pricing" }
);

-- 8. Lead Activity Audit Trail
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('email_captured', 'high_intent_triggered', 'meeting_booked', 'slack_notified', 'crm_synced')),
    details JSONB DEFAULT '{}'::jsonb
);

-- Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
Supabase Vector Search Function
Use this stored procedure in your backend code to query relevant website documentation chunks when a user asks a question:
SQL
CREATE OR REPLACE FUNCTION match_kb_chunks (
  query_embedding vector(1536),
  target_agent_id UUID,
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_chunks.id,
    kb_chunks.content,
    kb_chunks.source_url,
    1 - (kb_chunks.embedding <=> query_embedding) AS similarity
  FROM kb_chunks
  WHERE kb_chunks.agent_id = target_agent_id
    AND 1 - (kb_chunks.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kb_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
Multi-Tenant Security (Row Level Security)
Enable RLS so dashboard users can only access their own organization data while allowing the public widget script to interact safely:
