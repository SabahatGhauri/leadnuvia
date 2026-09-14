import OpenAI from "openai";
export const providers = {
  groq: { baseURL: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY" },
  cerebras: { baseURL: "https://api.cerebras.ai/v1", key: "CEREBRAS_API_KEY" },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    key: "GEMINI_API_KEY",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    key: "OPENROUTER_API_KEY",
  },
  openai: { baseURL: "https://api.openai.com/v1", key: "OPENAI_API_KEY" },
} as const;
export type Provider = keyof typeof providers;
export function llmConfig(
  env: NodeJS.ProcessEnv = process.env,
  fallback = false,
) {
  const name = env[fallback ? "LLM_FALLBACK_PROVIDER" : "LLM_PROVIDER"];
  const model = env[fallback ? "LLM_FALLBACK_MODEL" : "LLM_MODEL"];
  if (!name || !Object.hasOwn(providers, name) || !model)
    throw new Error("Choose a supported AI provider and model.");
  const provider = name as Provider;
  const apiKey = env[providers[provider].key];
  if (!apiKey)
    throw new Error(`Configure ${providers[provider].key} on the server.`);
  return { provider, model, apiKey, baseURL: providers[provider].baseURL };
}
export function retryable(error: unknown) {
  const status = (error as { status?: number })?.status;
  return (
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    error instanceof OpenAI.APIConnectionError
  );
}
export async function* streamReply(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  signal?: AbortSignal,
) {
  const choices = [llmConfig()];
  if (process.env.LLM_FALLBACK_PROVIDER)
    choices.push(llmConfig(process.env, true));
  for (let index = 0; index < choices.length; index++) {
    const config = choices[index];
    let emitted = false;
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        maxRetries: 0,
        timeout: 45000,
      });
      const stream = await client.chat.completions.create(
        { model: config.model, messages, stream: true, max_tokens: 1200 },
        { signal },
      );
      let finished = false;
      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (
          (chunk as unknown as { error?: unknown }).error ||
          (choice?.finish_reason as string) === "error"
        )
          throw new Error("AI stream failed.");
        if (choice?.finish_reason === "length")
          throw new Error(
            "The response reached its limit. Please ask a shorter question.",
          );
        if (choice?.finish_reason === "content_filter")
          throw new Error("The provider could not answer this request.");
        if (choice?.finish_reason === "stop") finished = true;
        const text = choice?.delta?.content;
        if (text) {
          emitted = true;
          yield text;
        }
      }
      if (!emitted || !finished)
        throw new Error("The AI response ended unexpectedly.");
      return;
    } catch (error) {
      // Do not restart an answer after any text has reached the visitor.
      if (
        emitted ||
        signal?.aborted ||
        index === choices.length - 1 ||
        !retryable(error)
      )
        throw error;
    }
  }
}
