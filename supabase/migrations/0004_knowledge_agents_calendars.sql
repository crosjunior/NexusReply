-- =====================================================================
-- ReplyFlow — Migration 0004: Base de Conhecimento, Agentes de IA & Agendas
-- =====================================================================

-- 1. Bases de Conhecimento
create table if not exists public.knowledge_bases (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  category     text not null default 'Geral',
  description  text,
  objective    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_knowledge_bases_ws on public.knowledge_bases (workspace_id);

alter table public.knowledge_bases enable row level security;
create policy "knowledge_bases_member" on public.knowledge_bases
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- 2. Documentos da Base de Conhecimento (extração em JSON estruturado)
create table if not exists public.knowledge_documents (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
  title             text not null,
  source_type       text not null check (source_type in ('pdf', 'docx', 'xlsx', 'csv', 'md', 'txt', 'url', 'gdrive', 'onedrive')),
  file_url          text,
  file_size         bigint,
  content_json      jsonb,
  status            text not null default 'ready' check (status in ('pending', 'processing', 'ready', 'failed')),
  error_message     text,
  chunks_count      int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_knowledge_docs_base on public.knowledge_documents (knowledge_base_id);

alter table public.knowledge_documents enable row level security;
create policy "knowledge_docs_member" on public.knowledge_documents
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- 3. Chunks de Conhecimento (com busca textual em português de alta performance e baixo custo)
create table if not exists public.knowledge_chunks (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
  document_id       uuid not null references public.knowledge_documents(id) on delete cascade,
  content           text not null,
  metadata          jsonb default '{}'::jsonb,
  tsv               tsvector generated always as (to_tsvector('portuguese', content)) stored,
  created_at        timestamptz not null default now()
);
create index if not exists idx_knowledge_chunks_tsv on public.knowledge_chunks using gin(tsv);
create index if not exists idx_knowledge_chunks_base on public.knowledge_chunks (knowledge_base_id);

alter table public.knowledge_chunks enable row level security;
create policy "knowledge_chunks_member" on public.knowledge_chunks
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- Função RPC para busca em conhecimento rápida e relevante
create or replace function public.search_knowledge(
  p_workspace_id uuid,
  p_query text,
  p_base_ids uuid[] default null,
  p_limit int default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  knowledge_base_id uuid,
  content text,
  metadata jsonb,
  rank float4
)
language sql stable security definer set search_path = public as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.knowledge_base_id,
    c.content,
    c.metadata,
    ts_rank(c.tsv, plainto_tsquery('portuguese', p_query)) as rank
  from public.knowledge_chunks c
  where c.workspace_id = p_workspace_id
    and (p_base_ids is null or c.knowledge_base_id = any(p_base_ids))
    and c.tsv @@ plainto_tsquery('portuguese', p_query)
  order by rank desc
  limit p_limit;
$$;

-- 4. Conexões de Agenda (Google Calendar e Microsoft Outlook)
create table if not exists public.calendar_connections (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  provider           text not null check (provider in ('google', 'outlook')),
  account_email      text not null,
  calendar_id        text,
  access_token_enc   text not null,
  refresh_token_enc  text,
  token_expires_at   timestamptz,
  status             text not null default 'active' check (status in ('active', 'disconnected')),
  settings           jsonb default '{"duration_minutes": 30, "create_meeting_link": true, "business_hours": {"start": "09:00", "end": "18:00"}}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_calendar_conns_ws on public.calendar_connections (workspace_id);

alter table public.calendar_connections enable row level security;
create policy "calendar_conns_member" on public.calendar_connections
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- 5. Agendamentos
create table if not exists public.appointments (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces(id) on delete cascade,
  calendar_connection_id uuid references public.calendar_connections(id) on delete set null,
  contact_id             uuid references public.contacts(id) on delete set null,
  title                  text not null,
  description            text,
  start_time             timestamptz not null,
  end_time               timestamptz not null,
  meeting_url            text,
  provider_event_id      text,
  status                 text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'rescheduled')),
  created_at             timestamptz not null default now()
);
create index if not exists idx_appointments_ws on public.appointments (workspace_id, start_time);

alter table public.appointments enable row level security;
create policy "appointments_member" on public.appointments
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- 6. Agentes de Atendimento de IA (Inspirado no modelo NexusCRM)
create table if not exists public.ai_agents (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces(id) on delete cascade,
  name                   text not null,
  role                   text,
  avatar_url             text,
  target_audience        text,
  tone_of_voice          text default 'consultative',
  primary_objective      text default 'hybrid',
  objective_description  text,
  instructions           text,
  knowledge_base_ids     jsonb default '[]'::jsonb,
  channels               jsonb default '["instagram", "whatsapp"]'::jsonb,
  calendar_connection_id uuid references public.calendar_connections(id) on delete set null,
  guardrails             jsonb default '{"handoff_keywords": ["falar com humano", "atendente humano", "especialista", "suporte"], "protect_pricing": false}'::jsonb,
  status                 text not null default 'active' check (status in ('active', 'paused')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_ai_agents_ws on public.ai_agents (workspace_id);

alter table public.ai_agents enable row level security;
create policy "ai_agents_member" on public.ai_agents
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

