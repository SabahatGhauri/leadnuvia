import { test } from "node:test";
import assert from "node:assert/strict";
import { streamReply } from "../lib/llm.ts";
const frame = (text, finish = null) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text }, finish_reason: finish }] })}\n\n`;
test("stream falls back on a pre-response rate limit and uses the fallback provider key", async () => {
  const previousFetch = globalThis.fetch;
  const previousEnv = { ...process.env };
  const calls = [];
  Object.assign(process.env, {
    LLM_PROVIDER: "groq",
    LLM_MODEL: "primary",
    GROQ_API_KEY: "test-primary",
    LLM_FALLBACK_PROVIDER: "cerebras",
    LLM_FALLBACK_MODEL: "fallback",
    CEREBRAS_API_KEY: "test-fallback",
  });
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      key: new Headers(init.headers).get("authorization"),
    });
    if (calls.length === 1)
      return new Response(
        JSON.stringify({ error: { message: "rate limit" } }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    return new Response(
      frame("Hello") + frame("", "stop") + "data: [DONE]\n\n",
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  try {
    let result = "";
    for await (const chunk of streamReply([{ role: "user", content: "test" }]))
      result += chunk;
    assert.equal(result, "Hello");
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /api.groq.com/);
    assert.match(calls[1].url, /api.cerebras.ai/);
    assert.equal(calls[1].key, "Bearer test-fallback");
  } finally {
    globalThis.fetch = previousFetch;
    process.env = previousEnv;
  }
});
test("partial answer failure does not replay on the fallback", async () => {
  const previousFetch = globalThis.fetch;
  const previousEnv = { ...process.env };
  let calls = 0;
  Object.assign(process.env, {
    LLM_PROVIDER: "groq",
    LLM_MODEL: "primary",
    GROQ_API_KEY: "test-primary",
    LLM_FALLBACK_PROVIDER: "cerebras",
    LLM_FALLBACK_MODEL: "fallback",
    CEREBRAS_API_KEY: "test-fallback",
  });
  globalThis.fetch = async () => {
    calls++;
    return new Response(
      frame("Partial reply") +
        `data: ${JSON.stringify({ error: { message: "failure" }, choices: [] })}\n\n`,
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  try {
    const received = [];
    await assert.rejects(async () => {
      for await (const chunk of streamReply([
        { role: "user", content: "test" },
      ]))
        received.push(chunk);
    });
    assert.deepEqual(received, ["Partial reply"]);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    process.env = previousEnv;
  }
});
