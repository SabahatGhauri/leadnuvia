# LeadNuvia

AI sales conversations for **leadnuvia.com**.

The `feat/working-saas` branch contains the first application implementation: email authentication, private workspaces, configurable agents, pasted/website knowledge, streaming website chat, consent-based contact capture, a conversation dashboard, and CSV export.

AI providers are configurable: Groq, Cerebras, Gemini, OpenRouter, or OpenAI. Optional failover is explicit and only happens before any answer text has been sent. See [provider setup](docs/LLM_PROVIDERS.md).

The live `main` branch remains the coming-soon deployment until Supabase, an AI provider, and real end-to-end checks are ready.

## Development

Use Node 24, run `npm ci`, configure `.env.local` using `.env.example`, then `npm run dev`.

- `npm test`: PostgreSQL tenant isolation and service limits, signed-session checks, provider configuration, retrieval, and streaming behavior.
- `npm run build`: production build including TypeScript validation.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact migration, environment variables, and activation checklist. Run only the new `20260910000000_leadnuvia_app.sql` migration; older scripts are historical blueprint references.

## Scope

Individual workspaces, up to three agents, twenty sources per agent, and one hundred messages per agent each calendar month. Lead intent uses explained keyword rules. Booking is an external scheduler link. Live model/auth/email integration is pending credentials; billing and team access are not included in this version.
