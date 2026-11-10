"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

function ensureSuperAdmin(email?: string | null) {
  if (email?.toLowerCase() !== "carlos@conexaoagil.com.br") {
    throw new Error("Acesso não autorizado. Apenas o administrador mestre pode executar esta ação.");
  }
}

export async function toggleUserBlockAction(workspaceId: string, currentBlocked: boolean) {
  const { user } = await requireSession();
  ensureSuperAdmin(user.email);

  const db = admin();
  const nextBlocked = !currentBlocked;
  const { error } = await db
    .from("workspaces")
    .update({
      is_blocked: nextBlocked,
      subscription_status: nextBlocked ? "blocked" : "trial",
    })
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/admin");
  return { ok: true, blocked: nextBlocked };
}

export async function toggleUserUnlimitedAction(workspaceId: string, currentUnlimited: boolean) {
  const { user } = await requireSession();
  ensureSuperAdmin(user.email);

  const db = admin();
  const nextUnlimited = !currentUnlimited;
  const { error } = await db
    .from("workspaces")
    .update({
      is_unlimited: nextUnlimited,
      whatsapp_enabled: nextUnlimited,
      flows_limit: nextUnlimited ? 999999 : 1,
      ig_accounts_limit: nextUnlimited ? 999999 : 1,
      subscription_status: nextUnlimited ? "unlimited" : "trial",
      trial_ends_at: nextUnlimited ? new Date(Date.now() + 36500 * 86400000).toISOString() : new Date(Date.now() + 20 * 86400000).toISOString(),
    })
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/admin");
  return { ok: true, unlimited: nextUnlimited };
}

export async function extendUserTrialAction(workspaceId: string, additionalDays: number) {
  const { user } = await requireSession();
  ensureSuperAdmin(user.email);

  const db = admin();
  const { data: ws } = await db.from("workspaces").select("trial_ends_at, created_at").eq("id", workspaceId).single();
  const baseTime = ws?.trial_ends_at ? new Date(ws.trial_ends_at).getTime() : new Date(ws?.created_at || Date.now()).getTime() + 20 * 86400000;
  const nextDate = new Date(Math.max(Date.now(), baseTime) + additionalDays * 86400000).toISOString();

  const { error } = await db
    .from("workspaces")
    .update({
      trial_ends_at: nextDate,
      is_blocked: false,
      subscription_status: "trial",
    })
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/app/admin");
  return { ok: true, nextTrialEndsAt: nextDate };
}

export async function getWorkspaceAuditDetailsAction(workspaceId: string) {
  const { user } = await requireSession();
  ensureSuperAdmin(user.email);

  const db = admin();
  const [flowsRes, accountsRes, contactsRes, messagesRes] = await Promise.all([
    db.from("flows").select("id, name, status, created_at, updated_at, runs_count").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    db.from("ig_accounts").select("id, username, name, status, created_at").eq("workspace_id", workspaceId),
    db.from("contacts").select("id, username, name, created_at, last_interaction_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    db.from("messages").select("id, kind, text, direction, source, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30),
  ]);

  return {
    flows: flowsRes.data ?? [],
    accounts: accountsRes.data ?? [],
    contacts: contactsRes.data ?? [],
    recentMessages: messagesRes.data ?? [],
  };
}

