import "server-only";
import { admin } from "../supabase/admin";
import { env } from "../env";
import { IgApiError, replyToComment, sendMessage, toGraphMessage, typingOn } from "../instagram/api";
import { sendWaMessage, sendWaText, WaApiError } from "../whatsapp/api";
import { searchKnowledge } from "../knowledge/search";
import { buildAgentPrompt } from "../ai/agent-service";
import type { Effect } from "../engine/types";
import type { IgAccountRow, RunContext, WaAccountRow } from "./types";
import { generateReply } from "./ai";
import { enqueue } from "./jobs";

export interface ExecResult {
  /** A janela fechou ou a conta caiu: sessão deve expirar */
  aborted: boolean;
  /** Efeitos restantes foram reagendados (rate limit) */
  deferred: boolean;
}

export async function recordOutbound(
  ctx: RunContext,
  opts: { mid?: string; text?: string; kind: string; payload?: unknown; source: "bot" | "agent" | "system" },
) {
  const db = admin();
  await db.from("messages").upsert(
    {
      workspace_id: ctx.account.workspace_id,
      conversation_id: ctx.conversation.id,
      direction: "out",
      source: opts.source,
      mid: opts.mid ?? null,
      kind: opts.kind,
      text: opts.text ?? null,
      payload: opts.payload ?? null,
    },
    { onConflict: "mid", ignoreDuplicates: true },
  );
  await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: (opts.text ?? `[${opts.kind}]`).slice(0, 120) })
    .eq("id", ctx.conversation.id);
}

function windowOpen(ctx: RunContext) {
  return !!ctx.contact.window_expires_at && new Date(ctx.contact.window_expires_at) > new Date();
}

/**
 * Executa os efeitos do motor em ordem. Tags/campos são acumulados e gravados
 * de uma vez no final. Em rate limit, os efeitos restantes viram um job.
 */
export async function executeEffects(
  ctx: RunContext,
  effects: Effect[],
  meta: { flowId: string; sessionId?: string },
): Promise<ExecResult> {
  const db = admin();
  const tags = new Set(ctx.contact.tags);
  const fields = { ...ctx.contact.fields };
  let contactDirty = false;
  const result: ExecResult = { aborted: false, deferred: false };

  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];

    if (e.type === "send" || e.type === "ai_reply") {
      const viaComment = e.viaCommentId;
      if (!viaComment && !windowOpen(ctx)) {
        result.aborted = true; // fora da janela de 24h: não envia
        break;
      }
      const allowed = await db.rpc("consume_rate", { account: ctx.account.id, max_per_hour: env.maxSendsPerHour });
      if (allowed.data === false) {
        const next = new Date();
        next.setUTCMinutes(60, 5, 0);
        await enqueue("send_effects", {
          accountId: ctx.account.id,
          contactId: ctx.contact.id,
          flowId: meta.flowId,
          sessionId: meta.sessionId,
          effects: effects.slice(i),
        }, next);
        result.deferred = true;
        break;
      }

      try {
        let text: string | undefined;

        if (e.type === "ai_reply") {
          const history = await loadHistory(ctx.conversation.id);
          if (e.userText && history.at(-1)?.content !== e.userText) history.push({ role: "user", content: e.userText });

          let prompt = e.systemPrompt;
          try {
            const { data: agent } = await db
              .from("ai_agents")
              .select("*")
              .eq("workspace_id", ctx.account.workspace_id)
              .eq("status", "active")
              .limit(1)
              .maybeSingle();

            if (agent) {
              prompt = await buildAgentPrompt(agent, e.userText || history.at(-1)?.content || "");
            } else {
              const res = await searchKnowledge(ctx.account.workspace_id, e.userText || history.at(-1)?.content || "", undefined, 3);
              if (res.length > 0) {
                prompt += `\n\n--- BASE DE CONHECIMENTO ---\n` + res.map((r) => r.content).join("\n\n");
              }
            }
          } catch (err) {
            console.warn("[effects ai_reply] Falha ao enriquecer com agente/base:", err);
          }

          text = await generateReply({ systemPrompt: prompt, history });
        }

        if (ctx.channel === "whatsapp") {
          const waAcc = ctx.account as WaAccountRow;
          const phone = ctx.contact.phone_number ?? "";

          if (e.type === "ai_reply") {
            const sent = await sendWaText(ctx.token, waAcc.phone_number_id, phone, text!);
            await recordOutbound(ctx, {
              mid: sent.messages[0]?.id,
              text,
              kind: "text",
              source: "bot",
            });
          } else {
            const sent = await sendWaMessage(ctx.token, waAcc.phone_number_id, phone, e.message, meta.flowId, e.nodeId);
            text = e.message.text ?? (e.message.imageUrl ? "[imagem]" : undefined);
            await recordOutbound(ctx, {
              mid: sent.message_id,
              text,
              kind: e.message.buttons?.length ? "buttons" : e.message.imageUrl && !e.message.text ? "image" : "text",
              payload: e.message,
              source: "bot",
            });
          }
        } else {
          const igAcc = ctx.account as IgAccountRow;
          let message: Record<string, unknown>;
          if (e.type === "ai_reply") {
            if (!viaComment && ctx.contact.igsid) await typingOn(ctx.token, ctx.contact.igsid);
            message = { text: text! };
          } else {
            message = toGraphMessage(e.message, meta.flowId, e.nodeId);
            text = e.message.text ?? (e.message.imageUrl ? "[imagem]" : undefined);
          }
          const recipient = viaComment ? { comment_id: viaComment } : { id: ctx.contact.igsid! };
          const sent = await sendMessage(ctx.token, recipient, message, { igUserId: igAcc.ig_user_id });
          await recordOutbound(ctx, {
            mid: sent.message_id,
            text,
            kind: e.type === "send" && e.message.buttons?.length ? "buttons" : e.type === "send" && e.message.imageUrl && !e.message.text ? "image" : "text",
            payload: e.type === "send" ? e.message : null,
            source: "bot",
          });
        }
      } catch (err) {
        if (err instanceof IgApiError) {
          if (err.isAuth) {
            await db.from("ig_accounts").update({ status: "token_expired" }).eq("id", ctx.account.id);
            result.aborted = true;
            break;
          }
          if (err.isWindowClosed) {
            result.aborted = true;
            break;
          }
        }
        if (err instanceof WaApiError) {
          if (err.status === 401 || err.code === 190) {
            await db.from("whatsapp_accounts").update({ status: "disconnected" }).eq("id", ctx.account.id);
            result.aborted = true;
            break;
          }
        }
        throw err;
      }
      continue;
    }

    switch (e.type) {
      case "add_tag":
        tags.add(e.tag);
        contactDirty = true;
        break;
      case "remove_tag":
        tags.delete(e.tag);
        contactDirty = true;
        break;
      case "set_field":
        fields[e.field] = e.value;
        contactDirty = true;
        break;
      case "handoff":
        await db.from("conversations").update({ status: "human", unread_count: 1 }).eq("id", ctx.conversation.id);
        ctx.conversation.status = "human";
        await recordOutbound(ctx, { kind: "system", text: "Conversa transferida para atendimento humano", source: "system" });
        break;
      case "webhook":
        try {
          await fetch(e.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "ReplyFlow-Webhook/1.0" },
            body: JSON.stringify({ ...e.body, contact: { id: ctx.contact.id, igsid: ctx.contact.igsid, username: ctx.contact.username, tags: [...tags], fields } }),
            signal: AbortSignal.timeout(5000),
          });
        } catch (err) {
          console.warn("[webhook action] falhou", e.url, err);
        }
        break;
      case "schedule":
        if (meta.sessionId) {
          await enqueue("resume_session", { sessionId: meta.sessionId }, new Date(Date.now() + e.minutes * 60_000));
        }
        break;
    }
  }

  if (contactDirty) {
    const upd = { tags: [...tags], fields };
    await db.from("contacts").update(upd).eq("id", ctx.contact.id);
    Object.assign(ctx.contact, upd);
  }
  return result;
}

async function loadHistory(conversationId: string) {
  const { data } = await admin()
    .from("messages")
    .select("direction, text, source")
    .eq("conversation_id", conversationId)
    .not("text", "is", null)
    .neq("source", "system")
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? [])
    .reverse()
    .map((m) => ({ role: m.direction === "in" ? ("user" as const) : ("assistant" as const), content: m.text as string }));
}

/** Resposta pública ao comentário (sorteia uma das opções). */
export async function publicReply(token: string, commentId: string, options: string[] | undefined) {
  const list = (options ?? []).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return;
  const text = list[Math.floor(Math.random() * list.length)];
  try {
    await replyToComment(token, commentId, text);
  } catch (err) {
    console.warn("[public reply] falhou", err);
  }
}
