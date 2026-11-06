import "server-only";
import { admin } from "../supabase/admin";
import { encrypt, decrypt } from "../crypto";
import { refreshToken } from "../instagram/api";
import { claimJobs, completeJob, failJob, type JobRow } from "./jobs";
import { processStoredEvent } from "./process-event";
import { contextFor, loadFlow, runSession } from "./sessions";
import { executeEffects } from "./effects";
import type { Effect } from "../engine/types";
import type { ContactRow, ConversationRow, IgAccountRow, SessionRow } from "./types";

async function loadCtxByContact(contactId: string) {
  const db = admin();
  const { data: contact } = await db.from("contacts").select("*").eq("id", contactId).single<ContactRow>();
  if (!contact) return null;
  const { data: account } = await db
    .from("ig_accounts")
    .select("id, workspace_id, ig_user_id, username, access_token_enc, token_expires_at, status")
    .eq("id", contact.ig_account_id)
    .eq("status", "active")
    .maybeSingle<IgAccountRow>();
  if (!account) return null;
  const { data: conversation } = await db
    .from("conversations")
    .select("id, workspace_id, contact_id, status")
    .eq("contact_id", contact.id)
    .single<ConversationRow>();
  if (!conversation) return null;
  return contextFor(account, contact, conversation);
}

export async function runJob(job: JobRow) {
  const db = admin();
  switch (job.type) {
    case "process_event":
      await processStoredEvent(String(job.payload.eventId));
      return;

    case "resume_session": {
      const { data: session } = await db
        .from("flow_sessions")
        .select("*")
        .eq("id", String(job.payload.sessionId))
        .maybeSingle<SessionRow>();
      if (!session || session.status !== "scheduled") return;
      const ctx = await loadCtxByContact(session.contact_id);
      const flow = await loadFlow(session.flow_id);
      if (!ctx || !flow || ctx.conversation.status !== "bot") return;
      await runSession(ctx, flow, { type: "resume" }, { session });
      return;
    }

    case "send_effects": {
      const ctx = await loadCtxByContact(String(job.payload.contactId));
      if (!ctx) return;
      await executeEffects(ctx, job.payload.effects as Effect[], {
        flowId: String(job.payload.flowId),
        sessionId: job.payload.sessionId ? String(job.payload.sessionId) : undefined,
      });
      return;
    }

    case "refresh_tokens":
      await refreshExpiringTokens();
      return;
  }
}

/** Tokens longos duram 60 dias; renovamos quando faltam < 10 dias. */
export async function refreshExpiringTokens() {
  const db = admin();
  const { data } = await db
    .from("ig_accounts")
    .select("id, access_token_enc, token_expires_at, updated_at")
    .eq("status", "active")
    .lt("token_expires_at", new Date(Date.now() + 10 * 86400_000).toISOString())
    .lt("updated_at", new Date(Date.now() - 86400_000).toISOString())
    .limit(50);
  for (const acc of data ?? []) {
    try {
      const r = await refreshToken(decrypt(acc.access_token_enc));
      await db
        .from("ig_accounts")
        .update({
          access_token_enc: encrypt(r.access_token),
          token_expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", acc.id);
    } catch (err) {
      console.error("[refresh token]", acc.id, err);
      await db.from("ig_accounts").update({ status: "token_expired", updated_at: new Date().toISOString() }).eq("id", acc.id);
    }
  }
}

/** Uma "batida": processa jobs e reprocessa webhooks presos. Seguro para rodar em paralelo. */
export async function tick(budgetMs = 45_000) {
  const started = Date.now();
  const db = admin();
  let processed = 0;

  // webhooks que ficaram pendentes (falha no after()) ou falharam (retry até 5x)
  const { data: stuck } = await db
    .from("webhook_events")
    .select("id")
    .or(
      `and(status.eq.pending,created_at.lt.${new Date(Date.now() - 60_000).toISOString()}),and(status.eq.failed,attempts.lt.5)`,
    )
    .limit(50);
  for (const e of stuck ?? []) {
    await processStoredEvent(e.id);
    processed++;
  }

  while (Date.now() - started < budgetMs) {
    const jobs = await claimJobs(25);
    if (!jobs.length) break;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await runJob(job);
          await completeJob(job.id);
        } catch (err) {
          await failJob(job, err);
        }
      }),
    );
    processed += jobs.length;
  }

  await refreshExpiringTokens();
  return { processed, ms: Date.now() - started };
}
