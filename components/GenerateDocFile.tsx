'use client';

import React, { useState } from 'react';
import { FileText, Download, CheckCircle2 } from 'lucide-react';

export default function GenerateDocFile() {
  const [downloaded, setDownloaded] = useState(false);

  const docContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>AI Sales Agent SaaS Blueprint</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #1e293b; padding: 20px; }
  h1 { color: #312e81; font-size: 26pt; font-weight: bold; border-bottom: 2px solid #6366f1; padding-bottom: 8px; margin-top: 0; }
  h2 { color: #1e1b4b; font-size: 18pt; font-weight: bold; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  h3 { color: #4338ca; font-size: 14pt; font-weight: bold; margin-top: 16px; }
  p { font-size: 11pt; margin-bottom: 12px; }
  ul, ol { margin-bottom: 12px; font-size: 11pt; }
  li { margin-bottom: 4px; }
  .code-block { background-color: #0f172a; color: #38bdf8; font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt; padding: 12px; border-radius: 6px; white-space: pre-wrap; word-break: break-all; margin: 12px 0; }
  .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10pt; text-align: left; }
  .table th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
  .note { background-color: #e0e7ff; border-left: 4px solid #4f46e5; padding: 10px 14px; font-size: 10.5pt; margin: 12px 0; color: #1e1b4b; }
</style>
</head>
<body>

  <h1>AI Sales Agent SaaS Widget Blueprint</h1>
  <p><strong>System Architecture & Technical Implementation Document</strong></p>
  <p><em>Generated: September 2026 | Next.js App Router, Supabase, OpenAI, Stripe Integration</em></p>

  <hr/>

  <h2>1. Executive Summary & Core Stack</h2>
  <p>This technical specification details the complete implementation of a multi-tenant AI Sales Agent platform. The platform embeds an interactive sales agent onto client websites via a lightweight script, processes real-time LLM stream interactions, automatically qualifies leads based on intent scoring, and offers administrative control and analytics.</p>

  <table class="table">
    <tr><th>Component</th><th>Technology Selection</th><th>Purpose</th></tr>
    <tr><td>Frontend Framework</td><td>Next.js 15+ (App Router, Server Components)</td><td>Dashboard, API Routes, Embed Drawer</td></tr>
    <tr><td>Database & Auth</td><td>Supabase (PostgreSQL + RLS + Edge Functions)</td><td>Multi-tenant data isolation, Crons, Realtime</td></tr>
    <tr><td>AI Model</td><td>OpenAI GPT-4o / GPT-4o-mini</td><td>Real-time conversation stream & intent scoring</td></tr>
    <tr><td>Payments</td><td>Stripe Customer Billing Portal</td><td>Self-service plan switching and card updates</td></tr>
    <tr><td>Analytics & Charts</td><td>Recharts & HTML/CSV Exporters</td><td>Lead performance & conversion metrics</td></tr>
  </table>

  <h2>2. Environment Configuration (.env.local)</h2>
  <div class="code-block">
# App Host
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Engine
OPENAI_API_KEY=sk-proj-your-openai-api-key

# Integrations
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
  </div>

  <h2>3. Step-by-Step Setup Checklist</h2>

  <h3>Step 1: Database Setup & RLS Policy Migration</h3>
  <p>Run the SQL migration script in your Supabase SQL Editor. This initializes tables for <code>organizations</code>, <code>organization_members</code>, <code>agents</code>, <code>leads</code>, <code>lead_activities</code>, and <code>daily_metrics</code>. Row Level Security policies ensure tenants can only view their own records.</p>

  <h3>Step 2: Standalone Widget Loader Creation</h3>
  <p>Deploy <code>public/widget.js</code> into your Next.js project. Clients place this single <code>&lt;script&gt;</code> tag on their website. It injects a launcher bubble and a sandboxed <code>&lt;iframe&gt;</code> that loads the chat UI without interfering with client page styles.</p>

  <h3>Step 3: Real-time Streaming API Route (SSE)</h3>
  <p>Implement <code>app/api/chat/stream/route.ts</code> to handle Server-Sent Events (SSE). When a user sends a message, response tokens stream back immediately. After completion, Next.js <code>after()</code> triggers background lead evaluation without slowing down the user experience.</p>

  <h3>Step 4: Asynchronous Intent Scoring & Alerts</h3>
  <p>The endpoint <code>app/api/leads/evaluate-intent/route.ts</code> runs in the background. It sends conversation transcripts to OpenAI, extracts lead email/contact details, evaluates lead intent from 0–100, and notifies Slack if a high-intent lead (&ge;75) is identified.</p>

  <h3>Step 5: Daily Metrics Cron & Analytics Dashboard</h3>
  <p>Using <code>pg_cron</code>, a nightly Supabase Edge Function aggregates total leads, qualified leads, and conversion rates into <code>daily_metrics</code>. The Next.js dashboard uses Recharts to visualize lead trends and includes a CSV export button.</p>

  <h2>4. Verification & Testing Procedure</h2>
  <ol>
    <li><strong>Verify Web Embed:</strong> Add <code>&lt;script src="http://localhost:3000/widget.js" data-agent-id="&lt;AGENT_ID&gt;" async&gt;&lt;/script&gt;</code> to an HTML page. Ensure the floating bubble opens the chat container.</li>
    <li><strong>Test Streaming & Intent Scoring:</strong> Submit a high-intent query (e.g., <em>"I want to buy 50 team licenses today"</em>). Verify that streaming is instant and that the lead record in Supabase is updated to status <code>qualified</code> with an intent score &ge; 75.</li>
    <li><strong>Test CSV Export:</strong> Access <code>/dashboard/analytics</code> and click <em>Export CSV</em> to verify downloading the structured metrics data file.</li>
  </ol>

  <div class="note">
    <strong>Security Reminder:</strong> Never expose <code>SUPABASE_SERVICE_ROLE_KEY</code> or <code>STRIPE_SECRET_KEY</code> on client components. Only access them within Next.js API Routes or Server Components.
  </div>

</body>
</html>
  `;

  const handleDownloadDoc = () => {
    // Create Blob with official MS Word MIME type
    const blob = new Blob(['\ufeff' + docContent], {
      type: 'application/msword',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'AI_Sales_Agent_SaaS_Blueprint.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl mx-auto text-slate-100 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Download Architecture Document</h3>
          <p className="text-xs text-slate-400">Generate `.doc` file containing the complete blueprint & step-by-step setup guide</p>
        </div>
      </div>

      <button
        onClick={handleDownloadDoc}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg text-sm"
      >
        {downloaded ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Document Downloaded (.doc)!</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download .doc File</span>
          </>
        )}
      </button>
    </div>
  );
}
