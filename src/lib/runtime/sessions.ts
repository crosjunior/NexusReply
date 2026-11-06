import "server-only";
import { admin } from "../supabase/admin";
import { decrypt } from "../crypto";
import { advance, createState } from "../engine/core";
import type { EngineEvent, EntryContext } from "../engine/types";
import { executeEffects } from "./effects";
import type { ContactRow, ConversationRow, FlowRow, IgAccountRow, RunContext, SessionRow, WaAccountRow } from "./types";

const WAITING = ["waiting_input", "waiting_click", "waiting_any", "waiting_ai", "scheduled"];

export async function loadFlow(flowId: string): Promise<FlowRow | null> {
  const { data } = await admin()
    .from("flows")
    .select("id, workspace_id, name, status, published_graph")
    .eq("id", flowId)
    .maybeSingle();
  return (data as FlowRow) ?? null;
}

export async function latestWaitingSession(contactId: string): Promise<SessionRow | null> {
  const { data } = await admin()
    .from("flow_sessions")
    .select("*")
    .eq("contact_id", contactId)
    .in("status", WAITING)
    .gte("updated_at", new Date(Date.now() - 7 * 86400_000).toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SessionRow) ?? null;
}

export async function latestSessionForFlow(contactId: string, flowId: string): Promise<SessionRow | null> {
  const { data } = await admin()
    .from("flow_sessions")
    .select("*")
    .eq("contact_id", contactId)
    .eq("flow_id", flowId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SessionRow) ?? null;
}

export function contextFor(
  account: IgAccountRow | WaAccountRow,
  contact: ContactRow,
  conversation: ConversationRow,
  channel: "instagram" | "whatsapp" = "instagram"
): RunContext {
  return { channel, account, token: decrypt(account.access_token_enc), contact, conversation };
}

/**
 * Avança uma sessão (existente ou nova) com um evento, executa efeitos e persiste.
 * Retorna se o evento foi consumido.
 */
export async function runSession(
  ctx: RunContext,
  flow: FlowRow,
  event: EngineEvent,
  opts: { session?: SessionRow | null; entry?: EntryContext } = {},
): Promise<boolean> {
  const graph = flow.published_graph;
  if (!graph || flow.status !== "published") return false;
  const db = admin();

  // Pausa entre envios: concluir fluxos antigos quando um novo começa
  const isNew = event.type === "start" || !opts.session;
  const entry: EntryContext = opts.session?.entry ?? opts.entry ?? { type: "dm" };
  const prevState = opts.session?.state ?? createState(flow.id);

  const out = advance(
    graph,
    prevState,
    { contact: { tags: ctx.contact.tags, fields: ctx.contact.fields, username: ctx.contact.username, name: ctx.contact.name }, entry },
    event,
  );
  if (!out.consumed) return false;

  let sessionId = opts.session?.id;
  if (isNew) {
    // um fluxo novo encerra sessões pendentes do contato (comportamento ManyChat)
    await db
      .from("flow_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("contact_id", ctx.contact.id)
      .in("status", WAITING);
    const { data, error } = await db
      .from("flow_sessions")
      .insert({
        workspace_id: flow.workspace_id,
        flow_id: flow.id,
        contact_id: ctx.contact.id,
        state: out.state,
        status: out.state.status,
        entry,
      })
      .select("id")
      .single();
    if (error) throw error;
    sessionId = data.id;
    await db.rpc("increment_flow_runs", { fid: flow.id });
  }

  const exec = await executeEffects(ctx, out.effects, { flowId: flow.id, sessionId });
  const finalState = exec.aborted ? { ...out.state, status: "expired" as const } : out.state;
  await db
    .from("flow_sessions")
    .update({ state: finalState, status: finalState.status, updated_at: new Date().toISOString() })
    .eq("id", sessionId!);
  return true;
}
