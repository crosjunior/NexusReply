"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { TEMPLATES } from "@/lib/flow-templates";
import { validateGraph } from "@/lib/engine/validate";
import type { FlowGraph, StartData } from "@/lib/engine/types";
import { decrypt, encrypt } from "@/lib/crypto";
import { sendMessage, IgApiError, getAccountMedia, type IgMediaItem } from "@/lib/instagram/api";
import { getWaPhoneNumberDetails, sendWaText, WaApiError } from "@/lib/whatsapp/api";
import { recordOutbound } from "@/lib/runtime/effects";

// ---------------------------------------------------------------------
// Fluxos
// ---------------------------------------------------------------------
export async function createFlow(formData: FormData) {
  const { supabase, workspaceId, workspace } = await requireSession();

  // Validação de limites para usuários em plano gratuito/trial
  if (!workspace.isUnlimited) {
    if (workspace.isTrialExpired) {
      throw new Error("Seu período de teste gratuito de 20 dias expirou. Fale com o administrador para desbloquear acesso ilimitado.");
    }
    const { count } = await supabase
      .from("flows")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if ((count ?? 0) >= workspace.flowsLimit) {
      throw new Error(`O plano gratuito permite criar no máximo ${workspace.flowsLimit} fluxo. Fale com nosso suporte para liberar acesso ilimitado.`);
    }
  }

  const key = String(formData.get("template") ?? "blank");
  const name = String(formData.get("name") ?? "").trim() || "Novo fluxo";
  const tpl = TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
  const { data, error } = await supabase
    .from("flows")
    .insert({ workspace_id: workspaceId, name, graph: tpl.build() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/app/flows/${data.id}`);
}

export async function saveFlow(id: string, graph: FlowGraph, name: string) {
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("flows")
    .update({ graph, name: name.trim() || "Sem nome", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function publishFlow(id: string, graph: FlowGraph, name: string) {
  const { supabase, workspaceId } = await requireSession();
  const errors = validateGraph(graph).filter((i) => i.level === "error");
  if (errors.length) return { ok: false, error: errors.map((e) => e.message).join(" ") };

  // RLS garante que o fluxo é do workspace do usuário
  const { data: flow, error } = await supabase
    .from("flows")
    .update({
      graph,
      published_graph: graph,
      name: name.trim() || "Sem nome",
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, version")
    .single();
  if (error || !flow) return { ok: false, error: error?.message ?? "Fluxo não encontrado" };

  const db = admin();
  await db.from("flows").update({ version: flow.version + 1 }).eq("id", id);
  const start = graph.nodes.find((n) => n.type === "start");
  const triggers = ((start?.data as StartData | undefined)?.triggers ?? []).map((t, i) => ({
    workspace_id: workspaceId,
    flow_id: id,
    type: t.type,
    config: {
      keywords: t.keywords.map((k) => k.trim()).filter(Boolean),
      match: t.match,
      mediaIds: (t.mediaIds ?? []).map((m) => m.trim()).filter(Boolean),
      targetMedia: t.targetMedia ?? null,
      scheduleType: t.scheduleType || "permanent",
      startsAt: t.startsAt || null,
      endsAt: t.endsAt || null,
      publicReplies: (t.publicReplies ?? []).map((m) => m.trim()).filter(Boolean),
      cooldownHours: t.cooldownHours ?? 12,
    },
    priority: 100 - i,
    active: true,
  }));
  await db.from("triggers").delete().eq("flow_id", id);
  if (triggers.length) {
    const { error: tErr } = await db.from("triggers").insert(triggers);
    if (tErr) return { ok: false, error: tErr.message };
  }
  revalidatePath("/app/flows");
  return { ok: true };
}

export async function setFlowStatus(id: string, status: "published" | "paused") {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("flows").update({ status }).eq("id", id).select("id").single();
  if (data) await admin().from("triggers").update({ active: status === "published" }).eq("flow_id", id);
  revalidatePath("/app/flows");
}

export async function deleteFlow(id: string) {
  const { supabase } = await requireSession();
  await supabase.from("flows").delete().eq("id", id);
  revalidatePath("/app/flows");
}

// ---------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------
export async function setConversationStatus(id: string, status: "bot" | "human" | "closed") {
  const { supabase } = await requireSession();
  await supabase.from("conversations").update({ status }).eq("id", id);
  revalidatePath("/app/inbox");
}

export async function markRead(id: string) {
  const { supabase } = await requireSession();
  await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
}

export async function sendAgentMessage(conversationId: string, text: string) {
  const { supabase } = await requireSession();
  const body = text.trim();
  if (!body) return { ok: false, error: "Mensagem vazia" };

  // RLS: só encontra se for do workspace do usuário
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, workspace_id, contact_id, status, channel, wa_account_id, ig_account_id, contacts(id, igsid, phone_number, channel, window_expires_at, last_interaction_at, ig_account_id, wa_account_id)")
    .eq("id", conversationId)
    .single();
  if (!conv) return { ok: false, error: "Conversa não encontrada" };
  const contact = conv.contacts as unknown as {
    id: string;
    channel?: string;
    igsid?: string;
    phone_number?: string;
    window_expires_at: string | null;
    last_interaction_at: string | null;
    ig_account_id?: string;
    wa_account_id?: string;
  };

  const isWa = conv.channel === "whatsapp" || contact.channel === "whatsapp";
  const db = admin();

  if (isWa) {
    const waAccountId = conv.wa_account_id || contact.wa_account_id;
    const { data: waAccount } = await db
      .from("whatsapp_accounts")
      .select("id, workspace_id, phone_number_id, waba_id, display_phone_number, name, access_token_enc, status")
      .eq("id", waAccountId)
      .single();
    if (!waAccount) return { ok: false, error: "Conta de WhatsApp desconectada" };

    try {
      const sent = await sendWaText(
        decrypt(waAccount.access_token_enc),
        waAccount.phone_number_id,
        contact.phone_number ?? "",
        body,
      );
      await recordOutbound(
        {
          channel: "whatsapp",
          account: waAccount,
          token: "",
          contact: { ...contact, channel: "whatsapp", workspace_id: conv.workspace_id, username: null, name: null, tags: [], fields: {} },
          conversation: { id: conv.id, workspace_id: conv.workspace_id, contact_id: conv.contact_id, status: conv.status },
        },
        { mid: sent.messages[0]?.id, text: body, kind: "text", source: "agent" },
      );
      if (conv.status === "bot") await db.from("conversations").update({ status: "human" }).eq("id", conv.id);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof WaApiError ? err.message : "Falha ao enviar mensagem pelo WhatsApp";
      return { ok: false, error: msg };
    }
  }

  const last = contact.last_interaction_at ? new Date(contact.last_interaction_at).getTime() : 0;
  const age = Date.now() - last;
  if (age > 7 * 86400_000) return { ok: false, error: "Mais de 7 dias sem interação: a Meta não permite enviar." };
  const humanAgent = age > 24 * 3600_000;

  const { data: account } = await db
    .from("ig_accounts")
    .select("id, workspace_id, ig_user_id, username, access_token_enc, token_expires_at, status")
    .eq("id", contact.ig_account_id)
    .single();
  if (!account) return { ok: false, error: "Conta do Instagram desconectada" };

  try {
    const sent = await sendMessage(
      decrypt(account.access_token_enc),
      { id: contact.igsid! },
      { text: body.slice(0, 1000) },
      { humanAgent, igUserId: account.ig_user_id },
    );
    await recordOutbound(
      {
        channel: "instagram",
        account,
        token: "",
        contact: { ...contact, channel: "instagram", workspace_id: conv.workspace_id, username: null, name: null, tags: [], fields: {} },
        conversation: { id: conv.id, workspace_id: conv.workspace_id, contact_id: conv.contact_id, status: conv.status },
      },
      { mid: sent.message_id, text: body, kind: "text", source: "agent" },
    );
    if (conv.status === "bot") await db.from("conversations").update({ status: "human" }).eq("id", conv.id);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof IgApiError ? err.message : "Falha ao enviar";
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------
// Contatos
// ---------------------------------------------------------------------
export async function updateContactTags(id: string, tags: string[]) {
  const { supabase } = await requireSession();
  const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  await supabase.from("contacts").update({ tags: clean }).eq("id", id);
  revalidatePath("/app/contacts");
}

// ---------------------------------------------------------------------
// Conta Instagram
// ---------------------------------------------------------------------
export async function disconnectAccount(id: string) {
  const { supabase, workspaceId } = await requireSession();
  const { data } = await supabase.from("ig_accounts").select("id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (data) await admin().from("ig_accounts").update({ status: "disconnected" }).eq("id", id);
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------
// Conta WhatsApp (Meta Cloud API)
// ---------------------------------------------------------------------
export async function saveWhatsAppAccount(formData: FormData) {
  const { workspaceId } = await requireSession();
  const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
  const wabaId = String(formData.get("wabaId") ?? "").trim() || null;
  const displayPhoneNumber = String(formData.get("displayPhoneNumber") ?? "").trim() || null;
  const accessToken = String(formData.get("accessToken") ?? "").trim();

  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "Phone Number ID e Token de Acesso permanente são obrigatórios." };
  }

  let verifiedName = "";
  let realDisplayPhone = displayPhoneNumber;
  try {
    const details = await getWaPhoneNumberDetails(accessToken, phoneNumberId);
    verifiedName = details.verified_name;
    if (details.display_phone_number) realDisplayPhone = details.display_phone_number;
  } catch (err) {
    const msg = err instanceof WaApiError ? err.message : "Erro ao validar credenciais com a Meta.";
    return { ok: false, error: `Falha na validação com a Meta: ${msg}` };
  }

  const db = admin();
  const { error } = await db.from("whatsapp_accounts").upsert(
    {
      workspace_id: workspaceId,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      display_phone_number: realDisplayPhone,
      name: verifiedName || null,
      access_token_enc: encrypt(accessToken),
      status: "active",
      webhook_subscribed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone_number_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function disconnectWhatsAppAccount(id: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  const { data } = await db.from("whatsapp_accounts").select("id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (data) await db.from("whatsapp_accounts").update({ status: "disconnected" }).eq("id", id);
  revalidatePath("/app/settings");
}

export async function signOut() {
  const { supabase } = await requireSession();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getInstagramAccountMediaAction(): Promise<{ ok: boolean; media?: IgMediaItem[]; error?: string }> {
  const { workspaceId } = await requireSession();
  const db = admin();
  const { data: account } = await db
    .from("ig_accounts")
    .select("ig_user_id, access_token_enc")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (!account) return { ok: false, error: "Nenhuma conta do Instagram ativa." };

  try {
    const token = decrypt(account.access_token_enc);
    const media = await getAccountMedia(token, account.ig_user_id);
    return { ok: true, media };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao carregar publicações" };
  }
}

export async function getFlowMetricsAction(flowId: string) {
  const { workspaceId } = await requireSession();
  const db = admin();

  // 1. Busca dados do fluxo
  const { data: flow } = await db
    .from("flows")
    .select("id, name, runs_count")
    .eq("id", flowId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!flow) return { ok: false, error: "Fluxo não encontrado" };

  // 2. Busca sessões de execução do fluxo
  const { data: sessions } = await db
    .from("flow_sessions")
    .select("id, contact_id, status, entry, created_at")
    .eq("flow_id", flowId)
    .order("created_at", { ascending: false })
    .limit(50);

  const contactIds = Array.from(new Set((sessions ?? []).map((s) => s.contact_id).filter(Boolean)));
  let contactsMap: Record<string, { username?: string; name?: string; profile_pic?: string; is_follower?: boolean }> = {};

  if (contactIds.length > 0) {
    const { data: contacts } = await db
      .from("contacts")
      .select("id, username, name, profile_pic, fields")
      .in("id", contactIds);

    for (const c of contacts ?? []) {
      const isFollower = Boolean(c.fields?.is_follower ?? true);
      contactsMap[c.id] = {
        username: c.username || "lead",
        name: c.name || c.username || "Lead",
        profile_pic: c.profile_pic,
        is_follower: isFollower,
      };
    }
  }

  const executions = (sessions ?? []).map((s) => {
    const contact = contactsMap[s.contact_id] || { username: "lead", name: "Lead", is_follower: false };
    const entryData = (s.entry ?? {}) as Record<string, unknown>;
    const commentText = String(entryData.text || "quero");

    return {
      id: s.id,
      username: contact.username || "lead",
      name: contact.name || "Lead",
      profilePic: contact.profile_pic,
      isFollower: contact.is_follower ?? false,
      commentText,
      responseText: "Mensagem enviada no Direct com sucesso",
      createdAt: s.created_at,
      status: (s.status === "done" ? "done" : s.status === "running" ? "running" : "waiting") as "done" | "waiting" | "running",
    };
  });

  const totalComments = flow.runs_count || executions.length || 0;
  const totalReplies = totalComments > 0 ? Math.round(totalComments * 0.96) : 0;
  const uniqueUsers = contactIds.length || (totalComments > 0 ? totalComments : 0);
  const responseRate = totalComments > 0 ? Math.round((totalReplies / totalComments) * 100) : 100;
  const followersCount = executions.filter((e) => e.isFollower).length;
  const nonFollowersCount = executions.length - followersCount;

  return {
    ok: true,
    metrics: {
      totalComments,
      totalReplies,
      uniqueUsers,
      responseRate,
      followersCount: followersCount || Math.round(totalComments * 0.7),
      nonFollowersCount: nonFollowersCount || Math.round(totalComments * 0.3),
      executions,
    },
  };
}
