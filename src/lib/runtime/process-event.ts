import "server-only";
import { admin } from "../supabase/admin";
import { decrypt } from "../crypto";
import { decodePayload } from "../engine/core";
import { pickTrigger, type TriggerRow } from "../engine/matching";
import type { EngineEvent, EntryContext } from "../engine/types";
import { getUserProfile } from "../instagram/api";
import type { NormalizedEvent } from "../instagram/webhook";
import { markWaRead } from "../whatsapp/api";
import type { NormalizedWaEvent } from "../whatsapp/webhook";
import { publicReply } from "./effects";
import { contextFor, latestSessionForFlow, latestWaitingSession, loadFlow, runSession } from "./sessions";
import type { ContactRow, ConversationRow, FlowRow, IgAccountRow, RunContext, WaAccountRow } from "./types";
import { enqueue } from "./jobs";

export class LockBusy extends Error {}

/** Processa um evento normalizado de webhook (idempotente por dedupe_key). */
export async function processEvent(ev: NormalizedEvent): Promise<"done" | "ignored"> {
  if (ev.kind === "ignored") return "ignored";
  const db = admin();

  const { data: account } = await db
    .from("ig_accounts")
    .select("id, workspace_id, ig_user_id, username, access_token_enc, token_expires_at, status")
    .eq("ig_user_id", ev.igUserId)
    .eq("status", "active")
    .maybeSingle<IgAccountRow>();
  if (!account) return "ignored";

  const userId = ev.kind === "comment" ? ev.fromId : ev.senderId;
  if (userId === account.ig_user_id) return "ignored"; // a própria conta comentando

  // lock por contato: evita duas execuções concorrentes do motor
  const lockKey = `contact:${account.id}:${userId}`;
  const { data: locked } = await db.rpc("acquire_lock", { lock_key: lockKey, ttl_seconds: 60 });
  if (!locked) throw new LockBusy(lockKey);

  try {
    const token = decrypt(account.access_token_enc);
    const opensWindow = ev.kind !== "comment" && !(ev.kind === "message" && ev.isEcho);
    const contact = await upsertContact(account, token, userId, {
      username: ev.kind === "comment" ? ev.fromUsername : undefined,
      opensWindow,
    });
    const conversation = await upsertConversation(account, contact);
    const ctx = contextFor(account, contact, conversation);

    if (ev.kind === "message" && ev.isEcho) {
      // mensagem enviada pela equipe direto no app do Instagram
      await insertInbound(ctx, { mid: ev.mid, text: ev.text, kind: "text", direction: "out", source: "agent" });
      return "done";
    }

    if (ev.kind === "comment") return await handleComment(ctx, ev);

    const isPostback = ev.kind === "postback";
    const inserted = await insertInbound(ctx, {
      mid: ev.mid,
      text: isPostback ? ev.title : ev.text || attachmentLabel(ev),
      kind: isPostback ? "postback" : ev.storyReply ? "story_reply" : isStoryMention(ev) ? "story_mention" : "text",
      payload: isPostback ? { payload: ev.payload } : { attachments: ev.attachments, quick_reply: ev.quickReplyPayload, story: ev.storyReply },
      direction: "in",
      source: "user",
    });
    if (!inserted) return "ignored"; // duplicado

    if (conversation.status !== "bot") return "done"; // humano assumiu: bot pausado

    // ---- clique em botão / quick reply --------------------------------
    const rawPayload = isPostback ? ev.payload : ev.quickReplyPayload;
    const pb = decodePayload(rawPayload);
    if (pb) {
      const flow = await loadFlow(pb.flowId);
      if (flow && flow.workspace_id === account.workspace_id) {
        const session = await latestSessionForFlow(contact.id, flow.id);
        const event: EngineEvent = { type: "postback", nodeId: pb.nodeId, handleId: pb.handleId };
        if (await runSession(ctx, flow, event, { session })) return "done";
      }
    }

    const text = isPostback ? ev.title : ev.text;

    // ---- sessão aguardando resposta -----------------------------------
    const waiting = await latestWaitingSession(contact.id);
    const triggers = await loadTriggers(account.workspace_id);

    // palavra-chave de DM tem prioridade sobre um "aguardando clique"
    const kw = text ? pickTrigger(triggers, "dm_keyword", text) : null;
    const waitingNeedsText = waiting && ["waiting_input", "waiting_ai", "waiting_any"].includes(waiting.status);

    if (waiting && (waitingNeedsText || !kw)) {
      const flow = await loadFlow(waiting.flow_id);
      if (flow && (await runSession(ctx, flow, { type: "text", text: text ?? "" }, { session: waiting }))) return "done";
    }

    // ---- gatilhos --------------------------------------------------------
    if (!isPostback && isStoryMention(ev)) {
      const t = pickTrigger(triggers, "story_mention", "");
      if (t && (await startFlow(ctx, t, { type: "story_mention", text }))) return "done";
    }
    if (!isPostback && ev.storyReply) {
      const t = pickTrigger(triggers, "story_reply", text ?? "");
      if (t && (await startFlow(ctx, t, { type: "story_reply", text }))) return "done";
    }
    if (kw && (await startFlow(ctx, kw, { type: "dm", text }))) return "done";

    const def = pickTrigger(triggers, "default_reply", "");
    if (def && (await cooldownOk(contact.id, def))) {
      await startFlow(ctx, def, { type: "dm", text });
    }
    return "done";
  } finally {
    await db.rpc("release_lock", { lock_key: lockKey });
  }
}

// ---------------------------------------------------------------------

async function handleComment(ctx: RunContext, ev: Extract<NormalizedEvent, { kind: "comment" }>) {
  const db = admin();
  await insertInbound(ctx, {
    mid: `comment:${ev.commentId}`,
    text: ev.text,
    kind: "comment",
    payload: { comment_id: ev.commentId, media_id: ev.mediaId, media_type: ev.mediaProductType },
    direction: "in",
    source: "user",
  });

  const triggers = await loadTriggers(ctx.account.workspace_id);
  const t = pickTrigger(triggers, "comment_keyword", ev.text, { mediaId: ev.mediaId });
  if (!t) return "done" as const;

  // 1 private reply por comentário (a Meta rejeita o segundo)
  const { error } = await db
    .from("comment_replies")
    .insert({ comment_id: ev.commentId, ig_account_id: ctx.account.id, trigger_id: t.id });
  if (error) return "ignored" as const;

  await publicReply(ctx.token, ev.commentId, t.config.publicReplies);
  await startFlow(ctx, t, { type: "comment", commentId: ev.commentId, mediaId: ev.mediaId, text: ev.text });
  return "done" as const;
}

async function startFlow(ctx: RunContext, t: TriggerRow, entry: EntryContext) {
  const flow = await loadFlow(t.flow_id);
  if (!flow) return false;
  return runSession(ctx, flow, { type: "start" }, { entry });
}

async function cooldownOk(contactId: string, t: TriggerRow) {
  const hours = Number(t.config.cooldownHours ?? 12);
  if (!hours) return true;
  const { count } = await admin()
    .from("flow_sessions")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("flow_id", t.flow_id)
    .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString());
  return !count;
}

// Cache curto de gatilhos por workspace (instância serverless "quente")
const triggerCache = new Map<string, { at: number; rows: TriggerRow[] }>();
async function loadTriggers(workspaceId: string): Promise<TriggerRow[]> {
  const hit = triggerCache.get(workspaceId);
  if (hit && Date.now() - hit.at < 15_000) return hit.rows;
  const { data } = await admin()
    .from("triggers")
    .select("id, flow_id, type, config, priority")
    .eq("workspace_id", workspaceId)
    .eq("active", true);
  const rows = (data ?? []) as TriggerRow[];
  triggerCache.set(workspaceId, { at: Date.now(), rows });
  return rows;
}

async function upsertContact(
  account: IgAccountRow,
  token: string,
  igsid: string,
  opts: { username?: string; opensWindow: boolean },
): Promise<ContactRow> {
  const db = admin();
  const now = new Date();
  const { data: existing } = await db
    .from("contacts")
    .select("*")
    .eq("ig_account_id", account.id)
    .eq("igsid", igsid)
    .maybeSingle<ContactRow>();

  const windowPatch = opts.opensWindow
    ? { last_interaction_at: now.toISOString(), window_expires_at: new Date(now.getTime() + 24 * 3600_000).toISOString() }
    : {};

  if (existing) {
    const patch: Record<string, unknown> = { ...windowPatch };
    if (opts.username && !existing.username) patch.username = opts.username;
    if (Object.keys(patch).length) {
      await db.from("contacts").update(patch).eq("id", existing.id);
      Object.assign(existing, patch);
    }
    return existing;
  }

  const profile = await getUserProfile(token, igsid);
  const { data, error } = await db
    .from("contacts")
    .upsert(
      {
        workspace_id: account.workspace_id,
        ig_account_id: account.id,
        igsid,
        username: profile?.username ?? opts.username ?? null,
        name: profile?.name ?? null,
        profile_pic: profile?.profile_pic ?? null,
        ...windowPatch,
      },
      { onConflict: "ig_account_id,igsid" },
    )
    .select("*")
    .single<ContactRow>();
  if (error) throw error;
  return data;
}

async function upsertConversation(account: IgAccountRow, contact: ContactRow): Promise<ConversationRow> {
  const db = admin();
  const { data: existing } = await db
    .from("conversations")
    .select("id, workspace_id, contact_id, status")
    .eq("contact_id", contact.id)
    .maybeSingle<ConversationRow>();
  if (existing) return existing;
  const { data, error } = await db
    .from("conversations")
    .upsert(
      { workspace_id: account.workspace_id, ig_account_id: account.id, contact_id: contact.id },
      { onConflict: "contact_id" },
    )
    .select("id, workspace_id, contact_id, status")
    .single<ConversationRow>();
  if (error) throw error;
  return data;
}

async function insertInbound(
  ctx: RunContext,
  m: { mid: string; text?: string; kind: string; payload?: unknown; direction: "in" | "out"; source: "user" | "agent" },
): Promise<boolean> {
  const db = admin();
  const { data } = await db
    .from("messages")
    .upsert(
      {
        workspace_id: ctx.account.workspace_id,
        conversation_id: ctx.conversation.id,
        direction: m.direction,
        source: m.source,
        mid: m.mid,
        kind: m.kind,
        text: m.text ?? null,
        payload: m.payload ?? null,
      },
      { onConflict: "mid", ignoreDuplicates: true },
    )
    .select("id");
  const inserted = (data?.length ?? 0) > 0;
  if (inserted) {
    const { data: conv } = await db.from("conversations").select("unread_count").eq("id", ctx.conversation.id).single();
    await db
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (m.text ?? `[${m.kind}]`).slice(0, 120),
        unread_count: m.direction === "in" ? (conv?.unread_count ?? 0) + 1 : conv?.unread_count ?? 0,
        ...(m.direction === "in" && ctx.conversation.status === "closed" ? { status: "bot" } : {}),
      })
      .eq("id", ctx.conversation.id);
    if (m.direction === "in" && ctx.conversation.status === "closed") ctx.conversation.status = "bot";
  }
  return inserted;
}

function isStoryMention(ev: Extract<NormalizedEvent, { kind: "message" | "postback" }>) {
  return ev.kind === "message" && !!ev.attachments?.some((a) => a.type === "story_mention");
}

function attachmentLabel(ev: Extract<NormalizedEvent, { kind: "message" }>) {
  const a = ev.attachments?.[0];
  if (!a) return "";
  if (a.type === "story_mention") return "[mencionou você no story]";
  return `[${a.type}]`;
}

// ---------------------------------------------------------------------
// Processamento de eventos do WhatsApp Cloud API
// ---------------------------------------------------------------------
export async function processWaEvent(ev: NormalizedWaEvent): Promise<"done" | "ignored"> {
  if (ev.kind !== "wa_message") return "ignored";
  const db = admin();

  const { data: account } = await db
    .from("whatsapp_accounts")
    .select("id, workspace_id, phone_number_id, waba_id, display_phone_number, name, access_token_enc, status")
    .eq("phone_number_id", ev.phoneNumberId)
    .eq("status", "active")
    .maybeSingle<WaAccountRow>();
  if (!account) return "ignored";

  const lockKey = `contact:wa:${account.id}:${ev.from}`;
  const { data: locked } = await db.rpc("acquire_lock", { lock_key: lockKey, ttl_seconds: 60 });
  if (!locked) throw new LockBusy(lockKey);

  try {
    const token = decrypt(account.access_token_enc);
    const now = new Date();
    const windowPatch = {
      last_interaction_at: now.toISOString(),
      window_expires_at: new Date(now.getTime() + 24 * 3600_000).toISOString(),
    };

    const { data: existingContact } = await db
      .from("contacts")
      .select("*")
      .eq("wa_account_id", account.id)
      .eq("phone_number", ev.from)
      .maybeSingle<ContactRow>();

    let contact: ContactRow;
    if (existingContact) {
      const patch: Record<string, unknown> = { ...windowPatch };
      if (ev.name && !existingContact.name) patch.name = ev.name;
      await db.from("contacts").update(patch).eq("id", existingContact.id);
      contact = { ...existingContact, ...patch };
    } else {
      const { data, error } = await db
        .from("contacts")
        .insert({
          workspace_id: account.workspace_id,
          wa_account_id: account.id,
          channel: "whatsapp",
          phone_number: ev.from,
          name: ev.name ?? null,
          tags: [],
          fields: {},
          ...windowPatch,
        })
        .select("*")
        .single<ContactRow>();
      if (error) throw error;
      contact = data;
    }

    const { data: existingConv } = await db
      .from("conversations")
      .select("id, workspace_id, contact_id, status")
      .eq("contact_id", contact.id)
      .maybeSingle<ConversationRow>();

    let conversation: ConversationRow;
    if (existingConv) {
      conversation = existingConv;
    } else {
      const { data, error } = await db
        .from("conversations")
        .insert({
          workspace_id: account.workspace_id,
          wa_account_id: account.id,
          contact_id: contact.id,
          channel: "whatsapp",
          status: "bot",
        })
        .select("id, workspace_id, contact_id, status")
        .single<ConversationRow>();
      if (error) throw error;
      conversation = data;
    }

    const ctx = contextFor(account, contact, conversation, "whatsapp");

    const isPostback = !!ev.isButtonReply;
    const inserted = await insertInbound(ctx, {
      mid: ev.mid,
      text: ev.text,
      kind: isPostback ? "postback" : "text",
      payload: isPostback ? { payload: ev.buttonPayload, title: ev.buttonTitle } : null,
      direction: "in",
      source: "user",
    });
    if (!inserted) return "ignored";

    markWaRead(token, account.phone_number_id, ev.mid).catch(() => {});

    if (conversation.status !== "bot") return "done";

    if (isPostback && ev.buttonPayload) {
      const pb = decodePayload(ev.buttonPayload);
      if (pb) {
        const flow = await loadFlow(pb.flowId);
        if (flow && flow.workspace_id === account.workspace_id) {
          const session = await latestSessionForFlow(contact.id, flow.id);
          const event: EngineEvent = { type: "postback", nodeId: pb.nodeId, handleId: pb.handleId };
          if (await runSession(ctx, flow, event, { session })) return "done";
        }
      }
    }

    const waiting = await latestWaitingSession(contact.id);
    const triggers = await loadTriggers(account.workspace_id);

    const kw = ev.text ? pickTrigger(triggers, "dm_keyword", ev.text) ?? pickTrigger(triggers, "wa_keyword" as any, ev.text) : null;
    const waitingNeedsText = waiting && ["waiting_input", "waiting_ai", "waiting_any"].includes(waiting.status);

    if (waiting && (waitingNeedsText || !kw)) {
      const flow = await loadFlow(waiting.flow_id);
      if (flow && (await runSession(ctx, flow, { type: "text", text: ev.text }, { session: waiting }))) return "done";
    }

    if (kw && (await startFlow(ctx, kw, { type: "dm", text: ev.text }))) return "done";

    const def = pickTrigger(triggers, "default_reply", "") ?? pickTrigger(triggers, "wa_default" as any, "");
    if (def && (await startFlow(ctx, def, { type: "dm", text: ev.text }))) return "done";

    return "done";
  } finally {
    await db.rpc("release_lock", { lock_key: lockKey });
  }
}

// ---------------------------------------------------------------------
// Execução a partir da tabela webhook_events
// ---------------------------------------------------------------------
export async function processStoredEvent(eventId: string) {
  const db = admin();
  const { data: row } = await db
    .from("webhook_events")
    .update({ status: "processing" })
    .eq("id", eventId)
    .in("status", ["pending", "failed"])
    .select("id, payload, attempts")
    .maybeSingle();
  if (!row) return; // outro worker já pegou

  try {
    const p = row.payload as { kind?: string };
    const status =
      p?.kind === "wa_message"
        ? await processWaEvent(row.payload as NormalizedWaEvent)
        : await processEvent(row.payload as NormalizedEvent);

    await db
      .from("webhook_events")
      .update({ status, processed_at: new Date().toISOString(), attempts: row.attempts + 1 })
      .eq("id", eventId);
  } catch (err) {
    const busy = err instanceof LockBusy;
    await db
      .from("webhook_events")
      .update({
        status: busy ? "pending" : "failed",
        attempts: row.attempts + (busy ? 0 : 1),
        last_error: err instanceof Error ? err.message.slice(0, 1000) : String(err),
      })
      .eq("id", eventId);
    if (busy) {
      await enqueue("process_event", { eventId }, new Date(Date.now() + 3000));
    } else {
      console.error("[processStoredEvent]", eventId, err);
    }
  }
}

