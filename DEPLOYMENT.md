# LeadNuvia on Railway

The initial deployment publishes the LeadNuvia coming-soon page and `/api/health`.
`proxy.ts` blocks dashboard, embed, widget, integration API routes, and non-read requests because the source blueprint does not yet implement tenant authentication. This also prevents calls to exported server actions. Do not remove the gate until tenant authorization is implemented and tested.

## Deploy

Run commands from this directory (the directory containing package.json and railway.json):

1. `npm ci`
2. `npm run build`
3. `npx @railway/cli login`
4. `npx @railway/cli up --yes --name leadnuvia --detach`
5. `npx @railway/cli domain`

Railway uses Node 24, builds with `npm run build`, starts with `npm run start`, and checks `/api/health`. Next.js reads Railway's PORT variable and binds to 0.0.0.0. No API credentials are needed for the launch page. Integration clients initialize on first use rather than during build.

## Custom domain

Add `leadnuvia.com` in Railway service Settings > Networking > Custom Domain. Copy the exact DNS records Railway provides into the domain registrar's DNS panel, then wait for verification and HTTPS provisioning. Do not guess the Railway target or change mail records.

## Before activating the application

- Add Supabase authentication and enforce organization membership on every server action, dashboard query, ingestion, billing, and evaluation endpoint. Current service-role queries bypass RLS.
- Replace the dashboard's placeholder organization ID with authenticated organization context; scope analytics queries to that organization.
- Complete the database schema/migrations and verify the tables and vector RPC match the application queries.
- Connect the chat input, message and lead persistence, settings save, and knowledge retrieval. These are still incomplete blueprint features.
- Add agent/domain checks and rate limits to public chat endpoints. Validate all input and ensure evaluation can only update the matching agent's leads.
- Configure the real environment variables from .env.example in Railway. NEXT_PUBLIC variables are embedded at build time and require redeployment after changes. Never put service credentials in NEXT_PUBLIC variables.
- Configure and verify Stripe webhook signing, prices, Supabase policies, and optional Firecrawl/Slack/Cal.com integrations with test data.
- Remove the launch gate only after end-to-end and tenant-isolation checks pass.

Supabase Edge Functions run under Deno and are intentionally excluded from the Next.js TypeScript check; they require separate validation and deployment.
