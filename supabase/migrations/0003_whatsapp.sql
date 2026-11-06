-- =====================================================================
-- ReplyFlow — Migration 0003: Suporte a WhatsApp Cloud API (Meta)
-- =====================================================================

-- 1. Contas de WhatsApp (Meta Cloud API)
create table if not exists public.whatsapp_accounts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  phone_number_id      text not null unique,       -- ID do número de telefone na Meta
  waba_id              text,                       -- WhatsApp Business Account ID
  display_phone_number text,                       -- ex: +55 11 99999-9999
  name                 text,                       -- Nome do canal / perfil
  access_token_enc     text not null,              -- Token de acesso permanente da Meta criptografado (AES-256-GCM)
  status               text not null default 'active' check (status in ('active','disconnected')),
  webhook_subscribed   boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_whatsapp_accounts_ws on public.whatsapp_accounts (workspace_id);

alter table public.whatsapp_accounts enable row level security;

create policy "whatsapp_accounts_member" on public.whatsapp_accounts
  for all using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

-- 2. Ajustes na tabela contacts para suportar múltiplos canais (Instagram e WhatsApp)
alter table public.contacts alter column ig_account_id drop not null;
alter table public.contacts alter column igsid drop not null;
alter table public.contacts add column if not exists wa_account_id uuid references public.whatsapp_accounts(id) on delete cascade;
alter table public.contacts add column if not exists channel text not null default 'instagram' check (channel in ('instagram','whatsapp'));
alter table public.contacts add column if not exists phone_number text;
create index if not exists idx_contacts_wa on public.contacts (wa_account_id, phone_number);

-- 3. Ajustes na tabela conversations para suportar WhatsApp
alter table public.conversations alter column ig_account_id drop not null;
alter table public.conversations add column if not exists wa_account_id uuid references public.whatsapp_accounts(id) on delete cascade;
alter table public.conversations add column if not exists channel text not null default 'instagram' check (channel in ('instagram','whatsapp'));

-- 4. Permitir gatilhos com tipos de WhatsApp caso desejado
alter table public.triggers drop constraint if exists triggers_type_check;
alter table public.triggers add constraint triggers_type_check 
  check (type in ('comment_keyword','dm_keyword','story_reply','story_mention','default_reply','wa_keyword','wa_default'));
