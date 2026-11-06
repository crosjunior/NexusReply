-- =====================================================================
-- ReplyFlow — schema inicial
-- Multi-tenant (workspaces), contas Instagram, contatos, fluxos,
-- gatilhos, conversas, mensagens, sessões de fluxo, fila de jobs.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Workspaces e membros
-- ---------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner','admin','agent')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

-- Helper usado nas policies de RLS
create or replace function public.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Cria workspace automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ws_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1)), new.id)
  returning id into ws_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Contas Instagram conectadas
-- ---------------------------------------------------------------------
create table public.ig_accounts (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  ig_user_id         text not null unique,       -- ID da conta profissional (entry.id nos webhooks)
  app_scoped_id      text,
  username           text,
  name               text,
  profile_picture_url text,
  access_token_enc   text not null,              -- AES-256-GCM (ver src/lib/crypto.ts)
  token_expires_at   timestamptz,
  status             text not null default 'active' check (status in ('active','token_expired','disconnected')),
  webhook_subscribed boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.ig_accounts (workspace_id);

-- ---------------------------------------------------------------------
-- Contatos (assinantes)
-- ---------------------------------------------------------------------
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  ig_account_id       uuid not null references public.ig_accounts(id) on delete cascade,
  igsid               text not null,             -- Instagram-scoped ID do usuário
  username            text,
  name                text,
  profile_pic         text,
  tags                text[] not null default '{}',
  fields              jsonb not null default '{}'::jsonb,
  last_interaction_at timestamptz,
  window_expires_at   timestamptz,               -- fim da janela de 24h
  created_at          timestamptz not null default now(),
  unique (ig_account_id, igsid)
);
create index on public.contacts (workspace_id, last_interaction_at desc);
create index on public.contacts using gin (tags);

-- ---------------------------------------------------------------------
-- Fluxos e gatilhos
-- ---------------------------------------------------------------------
create table public.flows (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  name            text not null,
  status          text not null default 'draft' check (status in ('draft','published','paused')),
  graph           jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,  -- rascunho
  published_graph jsonb,                                                   -- versão em produção
  version         int not null default 0,
  runs_count      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.flows (workspace_id);

create table public.triggers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  flow_id       uuid not null references public.flows(id) on delete cascade,
  type          text not null check (type in ('comment_keyword','dm_keyword','story_reply','story_mention','default_reply')),
  config        jsonb not null default '{}'::jsonb,
  -- config: { keywords: string[], match: 'contains'|'exact'|'any', media_ids?: string[],
  --           public_replies?: string[], cooldown_hours?: number }
  active        boolean not null default true,
  priority      int not null default 0,
  created_at    timestamptz not null default now()
);
create index on public.triggers (workspace_id, type) where active;

-- ---------------------------------------------------------------------
-- Conversas e mensagens (inbox)
-- ---------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  ig_account_id   uuid not null references public.ig_accounts(id) on delete cascade,
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  status          text not null default 'bot' check (status in ('bot','human','closed')),
  assigned_to     uuid references auth.users(id),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_count    int not null default 0,
  created_at      timestamptz not null default now(),
  unique (contact_id)
);
create index on public.conversations (workspace_id, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction       text not null check (direction in ('in','out')),
  source          text not null check (source in ('user','bot','agent','system')),
  mid             text unique,
  kind            text not null default 'text',  -- text | image | buttons | postback | comment | story_mention | story_reply
  text            text,
  payload         jsonb,
  created_at      timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- Sessões de fluxo (estado da máquina por contato)
-- ---------------------------------------------------------------------
create table public.flow_sessions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  flow_id       uuid not null references public.flows(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  state         jsonb not null,               -- EngineState serializado
  status        text not null,                -- espelho de state.status p/ consultas
  entry         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.flow_sessions (contact_id, updated_at desc);
create index on public.flow_sessions (contact_id) where status in ('waiting_input','waiting_any','waiting_click','scheduled');

-- ---------------------------------------------------------------------
-- Webhooks recebidos (idempotência + reprocessamento)
-- ---------------------------------------------------------------------
create table public.webhook_events (
  id          uuid primary key default gen_random_uuid(),
  dedupe_key  text not null unique,
  ig_user_id  text not null,
  kind        text not null,
  payload     jsonb not null,
  status      text not null default 'pending' check (status in ('pending','processing','done','failed','ignored')),
  attempts    int not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);
create index on public.webhook_events (status, created_at) where status in ('pending','failed');

-- Garante 1 private reply por comentário
create table public.comment_replies (
  comment_id  text primary key,
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  trigger_id  uuid references public.triggers(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fila de jobs (delays, retries, rate limit) — Postgres SKIP LOCKED
-- ---------------------------------------------------------------------
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,                 -- process_event | resume_session | refresh_tokens
  payload     jsonb not null default '{}'::jsonb,
  run_at      timestamptz not null default now(),
  status      text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts    int not null default 0,
  max_attempts int not null default 5,
  last_error  text,
  locked_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.jobs (run_at) where status = 'queued';

create or replace function public.claim_jobs(batch int default 20)
returns setof public.jobs language plpgsql as $$
begin
  -- libera jobs travados há mais de 5 min (worker caiu)
  update public.jobs set status = 'queued', locked_at = null
   where status = 'running' and locked_at < now() - interval '5 minutes';

  return query
  update public.jobs j set status = 'running', locked_at = now(), attempts = j.attempts + 1
   where j.id in (
     select id from public.jobs
      where status = 'queued' and run_at <= now()
      order by run_at
      limit batch
      for update skip locked
   )
  returning j.*;
end;
$$;

-- ---------------------------------------------------------------------
-- Rate limit por conta (janela por hora) — atômico
-- ---------------------------------------------------------------------
create table public.rate_buckets (
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  bucket        timestamptz not null,
  count         int not null default 0,
  primary key (ig_account_id, bucket)
);

create or replace function public.consume_rate(account uuid, max_per_hour int)
returns boolean language plpgsql as $$
declare b timestamptz := date_trunc('hour', now()); c int;
begin
  insert into public.rate_buckets (ig_account_id, bucket, count) values (account, b, 1)
  on conflict (ig_account_id, bucket) do update set count = public.rate_buckets.count + 1
  returning count into c;
  if c > max_per_hour then
    update public.rate_buckets set count = count - 1 where ig_account_id = account and bucket = b;
    return false;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Lock por contato (lease com expiração) — evita duas execuções
-- simultâneas do motor para o mesmo contato.
-- ---------------------------------------------------------------------
create table public.locks (
  key          text primary key,
  locked_until timestamptz not null
);

create or replace function public.acquire_lock(lock_key text, ttl_seconds int default 30)
returns boolean language plpgsql as $$
declare ok boolean;
begin
  insert into public.locks (key, locked_until) values (lock_key, now() + make_interval(secs => ttl_seconds))
  on conflict (key) do update set locked_until = excluded.locked_until
    where public.locks.locked_until < now()
  returning true into ok;
  return coalesce(ok, false);
end;
$$;

create or replace function public.release_lock(lock_key text)
returns void language sql as $$
  delete from public.locks where key = lock_key;
$$;

-- Contadores
create or replace function public.increment_flow_runs(fid uuid)
returns void language sql as $$
  update public.flows set runs_count = runs_count + 1 where id = fid;
$$;

-- ---------------------------------------------------------------------
-- RLS — usuários só veem dados do próprio workspace.
-- Webhooks e workers usam a service role (bypass de RLS).
-- ---------------------------------------------------------------------
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.ig_accounts       enable row level security;
alter table public.contacts          enable row level security;
alter table public.flows             enable row level security;
alter table public.triggers          enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.flow_sessions     enable row level security;
alter table public.webhook_events    enable row level security;
alter table public.comment_replies   enable row level security;
alter table public.jobs              enable row level security;
alter table public.rate_buckets      enable row level security;
alter table public.locks             enable row level security;

create policy ws_select on public.workspaces for select using (public.is_member(id));
create policy ws_update on public.workspaces for update using (owner_id = auth.uid());
create policy wm_select on public.workspace_members for select using (public.is_member(workspace_id));

-- ig_accounts: leitura pelo membro; escrita só pelo backend (token sensível)
create policy ig_select on public.ig_accounts for select using (public.is_member(workspace_id));

create policy contacts_all on public.contacts for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy flows_all on public.flows for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy triggers_select on public.triggers for select using (public.is_member(workspace_id));
create policy conv_all on public.conversations for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy msg_select on public.messages for select using (public.is_member(workspace_id));
create policy sessions_select on public.flow_sessions for select using (public.is_member(workspace_id));

-- Esconde a coluna do token mesmo para membros (grant só nas colunas seguras)
revoke all on public.ig_accounts from authenticated, anon;
grant select (id, workspace_id, ig_user_id, username, name, profile_picture_url,
              token_expires_at, status, webhook_subscribed, created_at, updated_at)
  on public.ig_accounts to authenticated;

-- RPCs internas: só service role
revoke execute on function public.claim_jobs(int) from public, anon, authenticated;
revoke execute on function public.consume_rate(uuid, int) from public, anon, authenticated;
revoke execute on function public.increment_flow_runs(uuid) from public, anon, authenticated;
revoke execute on function public.acquire_lock(text, int) from public, anon, authenticated;
revoke execute on function public.release_lock(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime para o inbox
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
