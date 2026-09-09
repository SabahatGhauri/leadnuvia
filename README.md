# LeadNuvia

AI sales conversations for **leadnuvia.com**.

The current deployable version publishes a coming-soon page and health endpoint. The dashboard and integration routes remain blocked until authentication, tenant isolation, and the remaining blueprint features are complete.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Railway setup and the application launch requirements.

Production build, TypeScript, launch page, health endpoint, and route-blocking checks passed locally.

---
# AI Sales Agent SaaS — Project Blueprint

This folder was organized from the uploaded planning/code document. It uses the advanced/later versions where the document contained multiple iterations of the same feature.

## Core flow

Client website → `public/widget.js` → `/embed/[agentId]` → `/api/chat/stream` → OpenAI + Supabase knowledge → streamed answer → background intent evaluation → lead update → optional Slack / booking action.

## Main folders

- `app/api/` — chat, ingestion, lead evaluation, Stripe endpoints.
- `app/dashboard/` — leads, settings, analytics.
- `app/embed/` — iframe chat UI.
- `components/` — chat, booking, analytics, billing, CSV and embed UI.
- `hooks/` — client streaming hook.
- `lib/` — Slack, Stripe and CSV helpers.
- `public/` — embeddable `widget.js`.
- `supabase/migrations/` — RLS and scheduled-job SQL.
- `supabase/functions/` — scheduled Supabase Edge Function.
- `supabase/reference/` — earlier baseline schema kept for reference only.

## Suggested implementation order

1. Copy `.env.example` to `.env.local` and fill secrets.
2. Create Supabase project and run `20260909_rls_policies.sql`.
3. Configure cron extensions/jobs only after the core app works.
4. Install dependencies with `npm install`.
5. Start with `npm run dev`.
6. Test `/api/ingest` with one website and a real agent ID.
7. Test the widget via `public/widget.js` and `/embed/[agentId]`.
8. Test SSE chat streaming and source-grounded answers.
9. Test lead capture and intent evaluation.
10. Add Slack and Cal.com.
11. Configure Stripe Checkout, webhook and customer portal.
12. Verify analytics and CSV export.

## Important security checks before production

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, or `STRIPE_SECRET_KEY` in browser code.
- Verify every public widget request is scoped to the requested agent and allowed domain.
- Review the RLS migration carefully before enabling anonymous access.
- Validate webhook signatures.
- Add rate limiting to ingestion/chat endpoints.
- Add abuse controls and per-plan usage limits.
- Replace placeholder URLs, IDs, prompts and pricing before deployment.

## Note

The source document contains code written over several iterations. This package organizes that material; it should still be reviewed, linted and integration-tested before production deployment.
