-- Self-contained application schema. Do not run the older blueprint scripts.
begin;
create table public.ln_agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  company_name text not null default '' check (char_length(company_name) <= 120),
  welcome_message text not null default 'Hi! How can I help you today?' check (char_length(welcome_message) <= 400),
  instructions text not null default '' check (char_length(instructions) <= 3000),
  primary_color text not null default '#0f766e' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  allowed_origins text[] not null default '{}',
  booking_url text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.ln_documents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ln_agents on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  source_url text not null default '',
  content text not null check (char_length(content) between 1 and 40000),
  created_at timestamptz not null default now()
);
create index on public.ln_documents(agent_id);
create table public.ln_conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ln_agents on delete cascade,
  origin text not null,
  email text,
  name text,
  intent_score int not null default 0 check (intent_score between 0 and 100),
  status text not null default 'new' check (status in ('new','qualified','contacted','won','lost')),
  summary text not null default '',
  busy_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.ln_conversations(agent_id,updated_at desc);
create table public.ln_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ln_conversations on delete cascade,
  role text not null check(role in ('user','assistant')),
  content text not null check(char_length(content) between 1 and 16000),
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.ln_messages(conversation_id,created_at);
create table public.ln_limits (
  key text primary key,
  count int not null default 1,
  expires_at timestamptz not null
);

alter table public.ln_agents enable row level security;
alter table public.ln_documents enable row level security;
alter table public.ln_conversations enable row level security;
alter table public.ln_messages enable row level security;
alter table public.ln_limits enable row level security;
revoke all on public.ln_agents,public.ln_documents,public.ln_conversations,public.ln_messages,public.ln_limits from anon,authenticated;
grant select,insert,update,delete on public.ln_agents,public.ln_documents to authenticated;
grant select,delete on public.ln_conversations to authenticated;
grant update (status) on public.ln_conversations to authenticated;
grant select on public.ln_messages to authenticated;
grant all on public.ln_agents,public.ln_documents,public.ln_conversations,public.ln_messages,public.ln_limits to service_role;
create policy ln_agent_owner on public.ln_agents for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy ln_document_owner on public.ln_documents for all to authenticated
  using(exists(select 1 from public.ln_agents a where a.id=agent_id and a.owner_id=auth.uid()))
  with check(exists(select 1 from public.ln_agents a where a.id=agent_id and a.owner_id=auth.uid()));
create policy ln_conversation_owner on public.ln_conversations for all to authenticated
  using(exists(select 1 from public.ln_agents a where a.id=agent_id and a.owner_id=auth.uid()))
  with check(exists(select 1 from public.ln_agents a where a.id=agent_id and a.owner_id=auth.uid()));
create policy ln_message_owner on public.ln_messages for select to authenticated
  using(exists(select 1 from public.ln_conversations c join public.ln_agents a on a.id=c.agent_id where c.id=conversation_id and a.owner_id=auth.uid()));

-- Hard quotas also apply when a client calls the database API directly.
create function public.ln_enforce_limits() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_TABLE_NAME='ln_agents' then
    perform pg_advisory_xact_lock(hashtext(new.owner_id::text));
    if (select count(*) from public.ln_agents where owner_id=new.owner_id)>=3 then raise exception 'Agent limit reached (3)'; end if;
  else
    perform pg_advisory_xact_lock(hashtext(new.agent_id::text));
    if (select count(*) from public.ln_documents where agent_id=new.agent_id)>=20 then raise exception 'Knowledge limit reached (20 sources)'; end if;
  end if;
  return new;
end $$;
create trigger ln_agents_limit before insert on public.ln_agents for each row execute function public.ln_enforce_limits();
create trigger ln_documents_limit before insert on public.ln_documents for each row execute function public.ln_enforce_limits();
revoke all on function public.ln_enforce_limits() from public,anon,authenticated;

-- Atomic, shared across app replicas. Invokable only by the backend.
create function public.ln_take_limit(bucket text, max_count int, seconds int) returns boolean
language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into public.ln_limits(key,count,expires_at) values(bucket,1,now()+make_interval(secs=>seconds))
  on conflict(key) do update set
    count=case when ln_limits.expires_at<=now() then 1 else ln_limits.count+1 end,
    expires_at=case when ln_limits.expires_at<=now() then now()+make_interval(secs=>seconds) else ln_limits.expires_at end
  returning count into n;
  return n<=max_count;
end $$;
revoke all on function public.ln_take_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.ln_take_limit(text,int,int) to service_role;

-- Serialize messages for one conversation, including across Railway replicas.
create function public.ln_lock_conversation(cid uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update public.ln_conversations set busy_until=now()+interval '120 seconds'
  where id=cid and (busy_until is null or busy_until<now());
  get diagnostics n=row_count;
  return n=1;
end $$;
revoke all on function public.ln_lock_conversation(uuid) from public,anon,authenticated;
grant execute on function public.ln_lock_conversation(uuid) to service_role;
commit;
