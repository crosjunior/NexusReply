-- =====================================================================
-- ReplyFlow — Migration 0005: Trials, Limites de Uso e Painel Admin
-- =====================================================================

-- 1. Novos campos em workspaces para controle de trial e limites
alter table public.workspaces
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '20 days'),
  add column if not exists is_blocked boolean not null default false,
  add column if not exists is_unlimited boolean not null default false,
  add column if not exists flows_limit integer not null default 1,
  add column if not exists ig_accounts_limit integer not null default 1,
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists subscription_status text not null default 'trial',
  add column if not exists admin_notes text;

-- 2. Concede privilégios ilimitados automáticos para o Super Admin carlos@conexaoagil.com.br
update public.workspaces w
set
  is_unlimited = true,
  whatsapp_enabled = true,
  flows_limit = 999999,
  ig_accounts_limit = 999999,
  subscription_status = 'unlimited',
  is_blocked = false
from auth.users u
where w.owner_id = u.id and lower(u.email) = 'carlos@conexaoagil.com.br';

-- 3. Atualiza o trigger de cadastro para inicializar novos usuários com 20 dias de teste
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  is_admin boolean;
begin
  is_admin := (lower(new.email) = 'carlos@conexaoagil.com.br');

  insert into public.workspaces (
    name,
    owner_id,
    plan,
    trial_ends_at,
    is_blocked,
    is_unlimited,
    flows_limit,
    ig_accounts_limit,
    whatsapp_enabled,
    subscription_status
  )
  values (
    coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1)),
    new.id,
    case when is_admin then 'unlimited' else 'trial' end,
    case when is_admin then (now() + interval '100 years') else (now() + interval '20 days') end,
    false,
    is_admin,
    case when is_admin then 999999 else 1 end,
    case when is_admin then 999999 else 1 end,
    is_admin,
    case when is_admin then 'unlimited' else 'trial' end
  )
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

