import { test } from "node:test";
import assert from "node:assert/strict";
import { signSession, readSession } from "../lib/widget-token.ts";
import {
  safeNext,
  origins,
  websiteUrl,
  intentScore,
} from "../lib/validation.ts";
import { llmConfig, retryable } from "../lib/llm.ts";
import { retrieve } from "../lib/knowledge.ts";
test("widget sessions reject tampering, expired tokens, and missing signing keys", () => {
  process.env.WIDGET_SIGNING_SECRET =
    "local-test-only-key-with-at-least-32-characters";
  const data = {
    agent: "agent-a",
    conversation: "private-a",
    origin: "https://example.com",
    expires: Date.now() + 10000,
  };
  const token = signSession(data);
  assert.deepEqual(readSession(token), data);
  const forged =
    Buffer.from(
      JSON.stringify({ ...data, conversation: "private-b" }),
    ).toString("base64url") +
    "." +
    token.split(".")[1];
  assert.throws(() => readSession(forged));
  assert.throws(() => readSession(token + ".extra"));
  assert.throws(() =>
    readSession(signSession({ ...data, expires: Date.now() - 1 })),
  );
  delete process.env.WIDGET_SIGNING_SECRET;
  assert.throws(() => signSession(data));
});
test("URLs reject unsafe schemes, private-style hosts, and redirect tricks", () => {
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://localhost",
    "https://x.local",
    "https://user:pass@example.com",
    "javascript:alert(1)",
    "https://[::1]",
  ])
    assert.throws(() => websiteUrl(url));
  assert.deepEqual(origins("https://example.com/path\nexample.com"), [
    "https://example.com",
  ]);
  for (const url of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
  ])
    assert.equal(safeNext(url), "/dashboard");
  assert.equal(safeNext("/reset-password"), "/reset-password");
});
test("each provider uses only its own key and a fixed endpoint", () => {
  assert.throws(() =>
    llmConfig({
      LLM_PROVIDER: "groq",
      LLM_MODEL: "test",
      OPENAI_API_KEY: "wrong-key",
    }),
  );
  assert.throws(() => llmConfig({ LLM_PROVIDER: "evil", LLM_MODEL: "test" }));
  assert.throws(() =>
    llmConfig({ LLM_PROVIDER: "__proto__", LLM_MODEL: "test" }),
  );
  const config = llmConfig({
    LLM_PROVIDER: "groq",
    LLM_MODEL: "test",
    GROQ_API_KEY: "groq-key",
    OPENAI_API_KEY: "different",
  });
  assert.equal(config.apiKey, "groq-key");
  assert.equal(config.baseURL, "https://api.groq.com/openai/v1");
  assert.equal(retryable({ status: 429 }), true);
  assert.equal(retryable({ status: 503 }), true);
  assert.equal(retryable({ status: 401 }), false);
});
test("retrieval limits context and does not return unrelated sources", () => {
  const docs = [
    {
      title: "Price",
      source_url: "https://example.com",
      content: "The monthly price is 50.",
    },
    { title: "Other", source_url: "", content: "Apples and oranges." },
  ];
  assert.equal(retrieve(docs, "What is the price?")[0].title, "Price");
  assert.equal(retrieve(docs, "Unmentioned topic").length, 0);
  assert.ok(
    retrieve(
      Array.from({ length: 20 }, () => ({
        ...docs[0],
        content: docs[0].content.repeat(1000),
      })),
      "price",
    ).length <= 5,
  );
  assert.equal(intentScore("pricing demo buy"), 100);
  assert.equal(intentScore("hello"), 0);
});
