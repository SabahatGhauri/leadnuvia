import { test } from "node:test";
import assert from "node:assert/strict";
import { llmConfig, streamReply } from "../lib/llm.ts";

const event = (type, data = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const text = event("content_block_delta", {
  index: 0,
  delta: { type: "text_delta", text: "Hello from Claude" },
});
const complete =
  text +
  event("message_delta", {
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 4 },
  }) +
  event("message_stop");

async function withClaude(fetch, action) {
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  Object.assign(process.env, {
    LLM_PROVIDER: "anthropic",
    LLM_MODEL: "test-claude",
    ANTHROPIC_API_KEY: "test-anthropic",
    LLM_FALLBACK_PROVIDER: "groq",
    LLM_FALLBACK_MODEL: "test-fallback",
    GROQ_API_KEY: "test-groq",
  });
  globalThis.fetch = fetch;
  try {
    await action();
  } finally {
    globalThis.fetch = oldFetch;
    process.env = oldEnv;
  }
}

test("Claude uses the Anthropic key, native endpoint, separate system prompt, and text deltas", async () => {
  assert.throws(() =>
    llmConfig({
      LLM_PROVIDER: "anthropic",
      LLM_MODEL: "test",
      OPENAI_API_KEY: "wrong-provider",
    }),
  );
  let request;
  await withClaude(
    async (url, init) => {
      request = {
        url: String(url),
        headers: new Headers(init.headers),
        body: JSON.parse(init.body),
      };
      return new Response(complete, {
        headers: { "Content-Type": "text/event-stream" },
      });
    },
    async () => {
      let answer = "";
      for await (const chunk of streamReply([
        { role: "system", content: "Use only supplied knowledge." },
        { role: "user", content: "Hi" },
      ]))
        answer += chunk;
      assert.equal(answer, "Hello from Claude");
      assert.equal(request.url, "https://api.anthropic.com/v1/messages");
      assert.equal(request.headers.get("x-api-key"), "test-anthropic");
      assert.equal(request.body.system, "Use only supplied knowledge.");
      assert.deepEqual(request.body.messages, [
        { role: "user", content: "Hi" },
      ]);
      assert.equal(request.body.max_tokens, 1200);
    },
  );
});

test("Claude rate limits may fall back before any output", async () => {
  const urls = [];
  await withClaude(
    async (url) => {
      urls.push(String(url));
      if (urls.length === 1)
        return new Response(
          JSON.stringify({
            type: "error",
            error: { type: "rate_limit_error", message: "Busy" },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Backup" }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
    async () => {
      let answer = "";
      for await (const chunk of streamReply([{ role: "user", content: "Hi" }]))
        answer += chunk;
      assert.equal(answer, "Backup");
      assert.equal(urls.length, 2);
      assert.match(urls[1], /api.groq.com/);
    },
  );
});

test("Claude incomplete or token-limited replies fail without replaying on another provider", async () => {
  for (const body of [
    text,
    text +
      event("message_delta", {
        delta: { stop_reason: "max_tokens" },
        usage: { output_tokens: 1200 },
      }) +
      event("message_stop"),
  ]) {
    let calls = 0;
    await withClaude(
      async () => {
        calls++;
        return new Response(body, {
          headers: { "Content-Type": "text/event-stream" },
        });
      },
      async () => {
        const chunks = [];
        await assert.rejects(async () => {
          for await (const chunk of streamReply([
            { role: "user", content: "Hi" },
          ]))
            chunks.push(chunk);
        });
        assert.deepEqual(chunks, ["Hello from Claude"]);
        assert.equal(calls, 1);
      },
    );
  }
});
