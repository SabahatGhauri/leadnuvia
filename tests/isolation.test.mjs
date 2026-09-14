import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL isolates customers, public access, writes, quotas, and conversation locks", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260910000000_leadnuvia_app.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const alice = "11111111-1111-4111-8111-111111111111",
      bob = "22222222-2222-4222-8222-222222222222";
    await db.exec(`insert into auth.users values('${alice}'),('${bob}');`);
    async function as(role, uid = "") {
      await db.exec(
        `reset role;set role ${role};select set_config('request.jwt.claim.sub','${uid}',false);`,
      );
    }
    await as("authenticated", alice);
    const a = (
      await db.query(
        `insert into ln_agents(name)values('Alice agent')returning id`,
      )
    ).rows[0].id;
    await db.query(
      `insert into ln_documents(agent_id,title,content)values($1,'Private pricing','Private Alice pricing')`,
      [a],
    );
    await assert.rejects(
      db.query(`insert into ln_agents(name,owner_id)values('Spoof',$1)`, [bob]),
    );
    await as("authenticated", bob);
    assert.equal((await db.query("select * from ln_agents")).rows.length, 0);
    assert.equal((await db.query("select * from ln_documents")).rows.length, 0);
    assert.equal(
      (
        await db.query(
          `update ln_agents set name='Hijacked' where id=$1 returning id`,
          [a],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `insert into ln_documents(agent_id,title,content)values($1,'Attack','Poison')`,
        [a],
      ),
    );
    const b = (
      await db.query(
        `insert into ln_agents(name)values('Bob agent')returning id`,
      )
    ).rows[0].id;
    await as("service_role");
    const c = (
      await db.query(
        `insert into ln_conversations(agent_id,origin,email)values($1,'https://alice.example','private@example.com')returning id`,
        [a],
      )
    ).rows[0].id;
    await db.query(
      `insert into ln_messages(conversation_id,role,content)values($1,'user','Private message')`,
      [c],
    );
    assert.equal(
      (await db.query(`select ln_lock_conversation($1) as ok`, [c])).rows[0].ok,
      true,
    );
    assert.equal(
      (await db.query(`select ln_lock_conversation($1) as ok`, [c])).rows[0].ok,
      false,
    );
    for (const expected of [true, true, false])
      assert.equal(
        (await db.query(`select ln_take_limit('test',2,60) as ok`)).rows[0].ok,
        expected,
      );
    await as("authenticated", bob);
    assert.equal(
      (await db.query("select * from ln_conversations")).rows.length,
      0,
    );
    assert.equal((await db.query("select * from ln_messages")).rows.length, 0);
    assert.equal(
      (
        await db.query(
          `update ln_conversations set status='won' where id=$1 returning id`,
          [c],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(db.query(`select ln_take_limit('test',999,60)`));
    await assert.rejects(db.query(`select ln_lock_conversation($1)`, [c]));
    await assert.rejects(
      db.query(
        `update ln_conversations set email='stolen@example.com' where id=$1`,
        [c],
      ),
    );
    await as("authenticated", alice);
    assert.equal(
      (await db.query("select * from ln_messages")).rows[0].content,
      "Private message",
    );
    await db.query(
      `update ln_conversations set status='contacted' where id=$1`,
      [c],
    );
    await assert.rejects(
      db.query(`update ln_agents set owner_id=$1 where id=$2`, [bob, a]),
    );
    await db.exec(`insert into ln_agents(name)values('Second'),('Third');`);
    await assert.rejects(
      db.exec(`insert into ln_agents(name)values('Fourth');`),
    );
    await assert.rejects(
      db.query(
        `insert into ln_messages(conversation_id,role,content)values($1,'assistant','Forged')`,
        [c],
      ),
    );
    await as("anon");
    for (const table of [
      "ln_agents",
      "ln_documents",
      "ln_conversations",
      "ln_messages",
      "ln_limits",
    ])
      await assert.rejects(db.query(`select * from ${table}`));
    await as("authenticated", bob);
    assert.equal((await db.query("select id from ln_agents")).rows[0].id, b);
  } finally {
    await db.close();
  }
});
