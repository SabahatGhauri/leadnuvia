📄 Full Architecture Blueprint & Setup Guide
Project: AI Sales Agent Embeddable SaaS Widget
Stack: Next.js (App Router), Supabase (PostgreSQL, RLS, Edge Functions, pg_cron), OpenAI API (GPT-4o / GPT-4o-mini), Stripe (Customer Portal), Recharts.
🎯 System Architecture Diagram
[ Client Website ] ──(embeds script)──> [ public/widget.js ]
                                                │
                                        (opens iframe)
                                                ▼
                                    [ /embed/[agentId] UI ]
                                                │
                                    (POST stream request)
                                                ▼
                                  [ /api/chat/stream (SSE) ] ──(Streaming Response)──> [ User ]
                                                │
                                      (After Response via after())
                                                ▼
                                [ /api/leads/evaluate-intent ]
                                        │               │
                                  (AI Scoring)    (High Intent >= 75)
                                        │               │
                                        ▼               ▼
                                 [ Supabase DB ]   [ Slack Alert / Cal.com ]
🛠️ Step-by-Step Implementation Blueprint
Step 1: Database Setup & Security (Supabase RLS & Cron)
Navigate to your Supabase Dashboard > SQL Editor.
Run the migration script provided earlier:
Sets up organizations, organization_members, agents, leads, lead_activities, and daily_metrics.
Enables Row Level Security (RLS) on all tables to keep multi-tenant data segregated by tenant ID (organization_id).
Runs pg_cron jobs to clean stale lead sessions weekly and aggregate daily metrics every night at midnight.
Step 2: Configure Environment Variables
Create or update your .env.local file in your Next.js project root:
Code snippet
# Next.js App Host
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Engine
OPENAI_API_KEY=sk-proj-your-openai-api-key

# Payments & Notifications
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
Step 3: Implement Core Code Structure
Organize your project files according to this folder layout:
Plaintext
├── app/
│   ├── api/
│   │   ├── chat/stream/route.ts       # SSE Token Streaming with Next.js after()
│   │   ├── leads/evaluate-intent/     # Async Intent Scoring & Slack Webhooks
│   │   └── stripe/portal/route.ts     # Stripe Customer Billing Portal Session
│   ├── dashboard/
│   │   └── analytics/page.tsx         # Dashboard Analytics with Recharts & CSV
│   └── embed/
│       └── [agentId]/page.tsx         # Lightweight widget iframe view
├── components/
│   ├── ExportCSVButton.tsx            # Utility to export lead metrics
│   ├── ManageBillingButton.tsx        # Self-service Stripe portal redirect button
│   ├── MetricsChart.tsx               # Recharts daily volume & conversion rate UI
│   └── SnippetGenerator.tsx           # Embed script generator for clients
├── lib/
│   ├── csv.ts                         # Client-side CSV parser and download trigger
│   └── stripe.ts                      # Stripe SDK client initialization
└── public/
    └── widget.js                      # Floating JS button script to paste into client sites
Step 4: Testing & Verifying the Pipeline
A. Testing Widget Embedding
Run your server locally: npm run dev (starts on http://localhost:3000).
Insert an agent record into Supabase:
SQL
INSERT INTO public.agents (id, organization_id, name, system_prompt)
VALUES ('11111111-1111-1111-1111-111111111111', '<your-org-id>', 'Sales Assistant', 'You are an AI SDR for Acme Corp.');
Test the embed code on an HTML test page:
HTML
<script
  src="http://localhost:3000/widget.js"
  data-agent-id="11111111-1111-1111-1111-111111111111"
  data-host="http://localhost:3000"
  async>
</script>
B. Verifying SSE Stream & Intent Trigger
Click the widget floating bubble and send a high-intent message: "I want to buy 50 licenses for my team today, who can I talk to?"
Confirm that tokens stream back instantly without latency.
Observe after() triggering /api/leads/evaluate-intent in the background.
Check Supabase leads table: verify intent_score updates (~80+) and status turns to 'qualified'.
C. Testing Metrics & CSV Export
Visit /dashboard/analytics.
Toggle between Lead Volume and Conversion %.
Click Export CSV to verify downloading the formatted raw daily metrics file.
