import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input.replace(/^\uFEFF/, ''));
const origin = 'http://localhost:3197';
const admin = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let userId, agentId, conversationId, server;
let stage = 'starting local app';
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3197'], {
    env: { ...process.env, ...config, NEXT_PUBLIC_APP_URL: origin }, stdio: 'ignore', windowsHide: true,
  });
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(origin + '/api/health', { signal: AbortSignal.timeout(10000) })).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  assert.ok(ready, 'App did not start');
  stage = 'creating test fixture';
  const created = await admin.auth.admin.createUser({ email: `chat-test-${randomUUID()}@example.com`, password: randomUUID() + randomUUID(), email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const agent = await admin.from('ln_agents').insert({ owner_id: userId, name: 'Temporary chat verification', company_name: 'Test Company', is_active: true, allowed_origins: ['https://example.com'] }).select('id').single();
  assert.ifError(agent.error);
  agentId = agent.data.id;
  assert.ifError((await admin.from('ln_documents').insert({ agent_id: agentId, title: 'Pricing FAQ', content: 'The Orbit plan costs 42 credits per month. The Orbit plan includes seven seats.' })).error);
  async function post(path, data) {
    return fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(data), signal: AbortSignal.timeout(100000) });
  }
  stage = 'checking widget origin restrictions';
  assert.equal((await post('/api/widget/start', { agentId, origin: 'https://unlisted.example' })).status, 403);
  const start = await post('/api/widget/start', { agentId, origin: 'https://example.com' });
  assert.equal(start.status, 200);
  const { token } = await start.json();
  assert.ok(token);
  stage = 'streaming real Claude answer';
  const chat = await post('/api/widget/chat', { token, message: 'What is the price of the Orbit plan and how many seats are included?' });
  assert.equal(chat.status, 200);
  const stream = await chat.text();
  const events = stream.split('\n\n').filter(x => x.startsWith('data: ')).map(x => JSON.parse(x.slice(6)));
  assert.ok(events.some(e => e.done));
  assert.ok(!events.some(e => e.error));
  const answer = events.map(e => e.text || '').join('');
  assert.match(answer, /42/);
  assert.match(answer, /seven|7/i);
  console.log('Real Claude streaming and grounded pricing answer: passed');
  const conv = await admin.from('ln_conversations').select('id').eq('agent_id', agentId).single();
  assert.ifError(conv.error);
  conversationId = conv.data.id;
  const messages = await admin.from('ln_messages').select('role,content').eq('conversation_id', conversationId);
  assert.ifError(messages.error);
  assert.equal(messages.data.length, 2);
  assert.ok(messages.data.some(m => m.role === 'assistant' && m.content === answer));
  stage = 'checking lead capture';
  assert.equal((await post('/api/widget/contact', { token, email: 'test@example.com', consent: false })).status, 400);
  assert.equal((await post('/api/widget/contact', { token, email: 'test@example.com', name: 'Integration test', consent: true })).status, 200);
  const contact = await admin.from('ln_conversations').select('email').eq('id', conversationId).single();
  assert.ifError(contact.error);
  assert.equal(contact.data.email, 'test@example.com');
  console.log('Saved transcript, consent enforcement, lead capture, and origin restrictions: passed');
} catch {
  console.error(`Live chat check failed while ${stage}. Credentials were not logged.`);
  process.exitCode = 1;
} finally {
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error) { console.error('Test account cleanup failed'); process.exitCode = 1; }
  }
  // Remove only rate-limit buckets belonging to this test's generated IDs.
  for (const id of [agentId, conversationId].filter(Boolean)) {
    const removed = await admin.from('ln_limits').delete().like('key', `%${id}%`);
    if (removed.error) console.log('Test rate-limit bucket cleanup requires follow-up');
  }
  server?.kill();
  console.log('Temporary test account cleanup and local server shutdown completed.');
}
