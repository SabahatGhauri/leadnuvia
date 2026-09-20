# LeadNuvia application deployment

The live main branch currently serves the coming-soon page. The feat/working-saas branch contains the application and must pass a real integration check before promotion to main.

Use the existing Railway project only:
https://railway.com/project/bef9a09c-deae-4006-a319-3cd93eea7629
Service: leadnuvia (46b7a981-ee19-4a04-921e-ef688ef0c813)
Domain: https://leadnuvia.com
Source: https://github.com/SabahatGhauri/leadnuvia

## 1. Supabase

Create a Supabase project. Run ONLY `supabase/migrations/20260910000000_leadnuvia_app.sql` in its SQL Editor, once. This creates the self-contained ln_ tables and access rules. The older migrations and reference files are historical blueprint material: do not run them or run all migrations together. No existing tables are dropped.

In Supabase Authentication URL Configuration:

- Site URL: https://leadnuvia.com
- Redirect URLs: https://leadnuvia.com/auth/callback and https://leadnuvia.com/auth/callback?next=/reset-password
- For local testing, add the corresponding localhost callback URLs with the exact port.
- Enable email/password authentication and keep email confirmation enabled.
- Configure a production SMTP provider before inviting customers; Supabase's default mail service is restricted.

The app uses cookie-based PKCE sessions. Confirmation and reset links must complete in the same browser that requested them. Configure Supabase Auth rate limits and bot protection before public signup at scale.

## 2. Railway variables

Add these to the ORIGINAL service's Variables panel (never to GitHub or chat):

| Variable                      | Value                                                    |
| ----------------------------- | -------------------------------------------------------- |
| NEXT_PUBLIC_APP_URL           | https://leadnuvia.com                                    |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase project URL                                     |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase public anon/publishable key                     |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase service-role key (server only)                  |
| WIDGET_SIGNING_SECRET         | A unique random secret of at least 32 characters         |
| LLM_PROVIDER                  | anthropic, groq, cerebras, gemini, openrouter, or openai |
| LLM_MODEL                     | An exact currently available model ID from that provider |
| ANTHROPIC_API_KEY             | Your Claude API key; required for LLM_PROVIDER=anthropic |
| FIRECRAWL_API_KEY             | Optional: enables importing individual website pages     |

Generate WIDGET_SIGNING_SECRET privately with a password manager (64 random characters). Pasted knowledge works without Firecrawl. See docs/LLM_PROVIDERS.md for all provider keys and opt-in fallback settings. No OpenAI account is required when another provider is selected.

Public Supabase variables are embedded in the build, so rebuild after changing them. Keep all other credentials server-only. Do not set a PUBLIC service-role key. Railway supplies PORT; the application binds 0.0.0.0 and uses port 8080 on the current service.

## 3. Verify before promotion

- `npm ci`
- `npm test`: local PostgreSQL tenant-isolation, privileges, quotas, session integrity, URL validation, retrieval, and mocked provider streaming/fallback tests.
- `npm run build`: production build and TypeScript.
- With a real staging Supabase project and provider key, complete signup, confirmation, login, password reset, and logout.
- Create two customer accounts. Verify each dashboard sees only its own agents, knowledge, conversations, and leads.
- Add an agent and paste a known FAQ. Preview the assistant while signed in as the owner and check grounded answers, missing-knowledge behavior, partial-stream failure, and saved transcripts.
- Install the widget on an allowed HTTPS website and verify an unlisted origin is refused. Domain checks restrict normal browser embedding; they are not bot authentication. Shared per-agent limits cap abuse regardless of spoofed origin headers.
- Submit contact details with consent, update lead status, and export CSV. Verify the booking link opens the business's scheduler; the app does not claim a booking was made.
- Verify monthly quotas and provider rate-limit handling with the intended production account.
- Review privacy/retention terms and use a suitable provider data plan before collecting customer data.

## 4. Deploy

After real integration checks pass, promote feat/working-saas to main. The existing Railway service is linked to GitHub main and deploys pushes. Do not create another project. Keep the existing ALIAS record for leadnuvia.com. Check `/api/health`, signup, and a real widget conversation after deployment.

## Current boundaries

This version supports individual owner workspaces (not team invitations), three agents per account, twenty knowledge sources per agent, and one hundred chat attempts per agent per calendar month. Rate limiting is shared in PostgreSQL across app instances. Provider failures count toward quota to cap spend. Preview chats count too.

Intent is a transparent keyword heuristic; it is not AI qualification or a calibrated buying probability. Retrieval selects up to five relevant passages with keyword matching. There is no global cache of customer content and no vector embedding requirement. Billing, automatic Slack alerts, multi-page crawling, automated booking confirmation, team roles, and background jobs are not activated. Legacy API routes return 410 rather than bypassing tenant authorization.

Live integration checks passed on 2026-09-20 using the configured Supabase project and Claude provider: temporary account sign-in, cross-customer isolation, anonymous access restrictions, a streamed answer grounded in a test FAQ, transcript persistence, contact consent enforcement, lead persistence, and allowed-origin enforcement. Temporary test accounts and chat fixtures were removed. Repeatable checks are in scripts/check-live-database.mjs and scripts/check-live-chat.mjs; they accept Railway configuration through stdin and do not persist credentials.

Signup-confirmation and password-reset email delivery and browser completion remain unverified. The application branch has not yet been promoted to main. These integration checks do not establish production email readiness or broad model-answer quality.
