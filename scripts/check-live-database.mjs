import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Accept configuration through stdin; never persist or print credentials.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const env = JSON.parse(input.replace(/^\uFEFF/, ''));
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const users = [];
let stage = 'creating temporary users';
try {
  const clients = [];
  for (let i = 0; i < 2; i++) {
    const email = `integration-${randomUUID()}@example.com`;
    const password = randomUUID() + randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(created.error);
    users.push(created.data.user.id);
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    const login = await client.auth.signInWithPassword({ email, password });
    assert.ifError(login.error);
    clients.push(client);
  }
  console.log('Temporary account sign-in: passed');
  stage = 'checking tenant isolation';
  const inserted = await clients[0].from('ln_agents').insert({ name: 'Temporary integration check' }).select('id').single();
  assert.ifError(inserted.error);
  const agentId = inserted.data.id;
  const document = await clients[0].from('ln_documents').insert({ agent_id: agentId, title: 'Test FAQ', content: 'Test plan costs 42 credits.' });
  assert.ifError(document.error);
  for (const table of ['ln_agents', 'ln_documents']) {
    const result = await clients[1].from(table).select('id').eq(table === 'ln_agents' ? 'id' : 'agent_id', agentId);
    assert.ifError(result.error);
    assert.equal(result.data.length, 0);
  }
  const denied = await clients[1].from('ln_documents').insert({ agent_id: agentId, title: 'Forbidden', content: 'Must fail.' });
  assert.ok(denied.error);
  console.log('Cross-customer reads and writes: blocked as expected');
  stage = 'checking public access';
  const anonymous = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
  const publicRead = await anonymous.from('ln_agents').select('id').eq('id', agentId);
  assert.ok(publicRead.error || publicRead.data.length === 0);
  console.log('Anonymous customer-data access: blocked as expected');
} catch {
  console.error(`Live database check failed while ${stage}. No credentials logged.`);
  process.exitCode = 1;
} finally {
  for (const id of users) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) { console.error('Temporary account cleanup failed'); process.exitCode = 1; }
  }
  console.log('Temporary account cleanup attempted for all created users.');
}
