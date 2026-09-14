# AI providers

LeadNuvia uses a server-side streaming adapter with explicit provider/model selection. It supports Anthropic Claude through the native Messages API, plus Groq, Cerebras, Gemini's OpenAI-compatible API, OpenRouter, and OpenAI. Model availability and account quotas must be checked in the provider dashboard before deployment.

Claude is the initial configuration for this project. Set these in Railway's service variables:

```
LLM_PROVIDER=anthropic
LLM_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=<set privately in Railway>
```

Haiku 4.5 is the initial model to evaluate for short sales conversations. Change LLM_MODEL to an available Sonnet model if evaluation shows a need for stronger answers. Native Claude requests preserve the system prompt separately from conversation history and only display text deltas. Thinking deltas are not displayed. Incomplete or token-limited replies are treated as failures. A live API test is required after the key is configured.

Example for evaluating Groq (confirm access to this model first):

```
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b
GROQ_API_KEY=<set privately in Railway>
```

Optional fallback, enabled only when both fields and that provider's key are configured:

```
LLM_FALLBACK_PROVIDER=cerebras
LLM_FALLBACK_MODEL=gpt-oss-120b
CEREBRAS_API_KEY=<set privately in Railway>
```

Other selections: `gemini` uses GEMINI_API_KEY, `openrouter` uses OPENROUTER_API_KEY, and `openai` uses OPENAI_API_KEY. Always set LLM_MODEL explicitly; never send a provider key to another provider's endpoint. Browser clients cannot select providers or read API keys.

Fallback is limited to connection errors, HTTP 429, or HTTP 5xx before any answer text is sent. Partial streams are never restarted on another provider. No automatic paid upgrade or unlimited retry is performed. Only enable a fallback provider whose data handling is approved for customer conversations. Google free-tier and paid-tier data handling differ; free model availability is not a production SLA.

Keep replies short and retrieve relevant knowledge passages instead of sending a whole website. Use one model call per answer; lead intent is transparently scored with lightweight keyword rules, not a second AI request. Benchmark answer correctness, first-token latency, failure rates, and tokens per conversation before choosing the production model.

Official references checked September 14, 2026:

- https://platform.claude.com/docs/en/models/overview
- https://platform.claude.com/docs/en/build-with-claude/streaming

- https://console.groq.com/docs/openai
- https://console.groq.com/docs/models
- https://console.groq.com/docs/rate-limits
- https://inference-docs.cerebras.ai/resources/openai
- https://inference-docs.cerebras.ai/support/rate-limits
- https://ai.google.dev/gemini-api/docs/openai
- https://ai.google.dev/gemini-api/docs/pricing
- https://openrouter.ai/docs/api/reference/limits
