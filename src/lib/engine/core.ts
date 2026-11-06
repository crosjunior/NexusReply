/**
 * Motor de fluxos — núcleo PURO (sem I/O).
 *
 * Recebe grafo + estado + contexto + evento e devolve o novo estado e uma
 * lista de efeitos (enviar mensagem, adicionar tag, agendar retomada...).
 * O runtime (src/lib/runtime) executa os efeitos contra o banco e a Graph API.
 * O simulador do builder roda este mesmo código no navegador.
 */
import {
  MAX_STEPS_PER_RUN,
  type AdvanceResult,
  type ContactSnapshot,
  type Effect,
  type EngineEvent,
  type EngineState,
  type EntryContext,
  type FlowGraph,
  type FlowNode,
  type InputData,
  type ConditionData,
  type MessageData,
  type ActionData,
  type DelayData,
  type AiData,
} from "./types";

export interface AdvanceContext {
  contact: ContactSnapshot;
  entry: EntryContext;
}

export interface AdvanceOutput extends AdvanceResult {
  /** false = o evento não pertencia a esta sessão (runtime tenta gatilhos) */
  consumed: boolean;
}

export function createState(flowId: string): EngineState {
  return {
    flowId,
    nodeId: null,
    status: "running",
    vars: {},
    privateReplyPending: false,
    steps: 0,
  };
}

export function getNode(graph: FlowGraph, id: string | null): FlowNode | undefined {
  if (!id) return undefined;
  return graph.nodes.find((n) => n.id === id);
}

export function nextTarget(graph: FlowGraph, nodeId: string, handle = "next"): string | null {
  const edge = graph.edges.find(
    (e) => e.source === nodeId && (e.sourceHandle ?? "next") === handle,
  );
  return edge?.target ?? null;
}

export function startTarget(graph: FlowGraph): string | null {
  const start = graph.nodes.find((n) => n.type === "start");
  return start ? nextTarget(graph, start.id) : null;
}

// ---------------------------------------------------------------------
// Payload de postback: rf1|flowId|nodeId|handleId
// ---------------------------------------------------------------------
export function encodePayload(flowId: string, nodeId: string, handleId: string): string {
  return ["rf1", flowId, nodeId, handleId].join("|");
}

export function decodePayload(
  payload: string | undefined | null,
): { flowId: string; nodeId: string; handleId: string } | null {
  if (!payload) return null;
  const parts = payload.split("|");
  if (parts.length !== 4 || parts[0] !== "rf1") return null;
  return { flowId: parts[1], nodeId: parts[2], handleId: parts[3] };
}

// ---------------------------------------------------------------------
// Variáveis: {{username}}, {{name}}, {{first_name}}, {{field.email}}
// ---------------------------------------------------------------------
export function renderTemplate(text: string, contact: ContactSnapshot): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (key === "username") return contact.username ?? "";
    if (key === "name") return contact.name ?? contact.username ?? "";
    if (key === "first_name") return (contact.name ?? contact.username ?? "").split(" ")[0];
    if (key.startsWith("field.")) {
      const v = contact.fields[key.slice(6)];
      return v == null ? "" : String(v);
    }
    return "";
  });
}

// ---------------------------------------------------------------------
// Validação do nó "input"
// ---------------------------------------------------------------------
export function validateInput(value: string, kind: InputData["validation"]): boolean {
  const v = value.trim();
  if (!v) return false;
  switch (kind) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    case "phone":
      return v.replace(/\D/g, "").length >= 8;
    case "number":
      return !Number.isNaN(Number(v.replace(",", ".")));
    default:
      return true;
  }
}

export function evaluateCondition(c: ConditionData, contact: ContactSnapshot): boolean {
  const field = c.field ? contact.fields[c.field] : undefined;
  switch (c.op) {
    case "has_tag":
      return !!c.tag && contact.tags.includes(c.tag);
    case "not_has_tag":
      return !c.tag || !contact.tags.includes(c.tag);
    case "field_exists":
      return field != null && String(field) !== "";
    case "field_equals":
      return String(field ?? "").toLowerCase() === String(c.value ?? "").toLowerCase();
    case "field_contains":
      return String(field ?? "").toLowerCase().includes(String(c.value ?? "").toLowerCase());
    default:
      return false;
  }
}

// ---------------------------------------------------------------------
// advance()
// ---------------------------------------------------------------------
export function advance(
  graph: FlowGraph,
  prev: EngineState,
  ctx: AdvanceContext,
  event: EngineEvent,
): AdvanceOutput {
  const state: EngineState = structuredClone(prev);
  state.steps = 0;
  const contact: ContactSnapshot = {
    ...ctx.contact,
    tags: [...ctx.contact.tags],
    fields: { ...ctx.contact.fields },
  };
  const effects: Effect[] = [];

  const emit = (e: Effect) => {
    effects.push(e);
    if (e.type === "add_tag" && !contact.tags.includes(e.tag)) contact.tags.push(e.tag);
    if (e.type === "remove_tag") contact.tags = contact.tags.filter((t) => t !== e.tag);
    if (e.type === "set_field") contact.fields[e.field] = e.value;
  };

  const done = (consumed = true): AdvanceOutput => ({ state, effects, consumed });

  // ------ trata o evento -------------------------------------------
  switch (event.type) {
    case "start": {
      state.nodeId = startTarget(graph);
      state.status = "running";
      state.privateReplyPending = false;
      if (ctx.entry.text) state.vars.__lastText = ctx.entry.text;
      break;
    }

    case "postback": {
      state.privateReplyPending = false;
      let target = nextTarget(graph, event.nodeId, event.handleId);
      if (!target && event.handleId === "skip") target = nextTarget(graph, event.nodeId, "next");
      state.nodeId = target;
      state.status = "running";
      state.aiTurns = 0;
      break;
    }

    case "text": {
      state.privateReplyPending = false;
      state.vars.__lastText = event.text;
      const node = getNode(graph, state.nodeId);

      if (state.status === "waiting_input" && node?.type === "input") {
        const data = node.data as InputData;
        if (!validateInput(event.text, data.validation)) {
          emit({
            type: "send",
            nodeId: node.id,
            message: {
              text: renderTemplate(data.retryMessage || "Não entendi, pode tentar de novo?", contact),
              quickReplies: data.skipLabel ? [{ id: "skip", title: data.skipLabel }] : undefined,
            },
          });
          return done();
        }
        emit({ type: "set_field", field: data.field, value: event.text.trim() });
        state.nodeId = nextTarget(graph, node.id);
        state.status = "running";
        break;
      }

      if (state.status === "waiting_ai" && node?.type === "ai") {
        const data = node.data as AiData;
        emit({ type: "ai_reply", nodeId: node.id, systemPrompt: data.systemPrompt, userText: event.text });
        state.aiTurns = (state.aiTurns ?? 0) + 1;
        if (state.aiTurns >= Math.max(1, data.maxTurns)) {
          state.nodeId = nextTarget(graph, node.id);
          state.status = "running";
          state.aiTurns = 0;
          break;
        }
        return done();
      }

      if (state.status === "waiting_click" && node?.type === "message") {
        // usuário digitou o texto de um quick reply/botão em vez de clicar
        const data = node.data as MessageData;
        const t = event.text.trim().toLowerCase();
        const hit =
          data.quickReplies.find((q) => q.title.trim().toLowerCase() === t) ??
          data.buttons.find((b) => b.type === "postback" && b.title.trim().toLowerCase() === t);
        if (!hit) return done(false);
        state.nodeId = nextTarget(graph, node.id, hit.id);
        state.status = "running";
        break;
      }

      if (state.status === "waiting_any") {
        state.status = "running"; // retoma no nó que estava bloqueado
        break;
      }

      return done(false);
    }

    case "resume": {
      if (state.status !== "scheduled" && state.status !== "waiting_any") return done(false);
      state.status = "running";
      break;
    }
  }

  // ------ executa nós até precisar esperar --------------------------
  while (state.status === "running") {
    if (!state.nodeId) {
      state.status = "completed";
      break;
    }
    if (++state.steps > MAX_STEPS_PER_RUN) {
      state.status = "completed"; // proteção contra loop infinito no grafo
      break;
    }
    const node = getNode(graph, state.nodeId);
    if (!node) {
      state.nodeId = null;
      continue;
    }

    const sends = node.type === "message" || node.type === "input" || node.type === "ai";
    if (sends && state.privateReplyPending) {
      // Meta só permite 1 private reply; o resto exige o usuário responder.
      state.status = "waiting_any";
      break;
    }
    const viaCommentId =
      sends && ctx.entry.type === "comment" && ctx.entry.commentId && !state.vars.__prUsed
        ? ctx.entry.commentId
        : undefined;
    const markPrivateReply = () => {
      if (viaCommentId) {
        state.vars.__prUsed = true;
        state.privateReplyPending = true;
      }
    };

    switch (node.type) {
      case "start":
        state.nodeId = nextTarget(graph, node.id);
        break;

      case "message": {
        const d = node.data as MessageData;
        const buttons = (d.buttons ?? []).slice(0, 3);
        const quickReplies = (d.quickReplies ?? []).slice(0, 13);
        if (d.imageUrl && !viaCommentId) {
          emit({ type: "send", nodeId: node.id, message: { imageUrl: d.imageUrl } });
        }
        const text = renderTemplate(d.text ?? "", contact);
        if (text || buttons.length || quickReplies.length) {
          emit({
            type: "send",
            nodeId: node.id,
            message: {
              text: text || " ",
              buttons: buttons.length ? buttons : undefined,
              quickReplies: quickReplies.length ? quickReplies : undefined,
            },
            viaCommentId,
          });
        }
        markPrivateReply();
        const waits = quickReplies.length > 0 || buttons.some((b) => b.type === "postback");
        if (waits) {
          state.status = "waiting_click";
        } else {
          state.nodeId = nextTarget(graph, node.id);
        }
        break;
      }

      case "input": {
        const d = node.data as InputData;
        emit({
          type: "send",
          nodeId: node.id,
          message: {
            text: renderTemplate(d.question, contact),
            quickReplies: d.skipLabel ? [{ id: "skip", title: d.skipLabel }] : undefined,
          },
          viaCommentId,
        });
        markPrivateReply();
        state.status = "waiting_input";
        break;
      }

      case "condition": {
        const ok = evaluateCondition(node.data as ConditionData, contact);
        state.nodeId = nextTarget(graph, node.id, ok ? "true" : "false");
        break;
      }

      case "action": {
        const d = node.data as ActionData;
        for (const a of d.actions ?? []) {
          if (a.kind === "add_tag" && a.tag) emit({ type: "add_tag", tag: a.tag });
          if (a.kind === "remove_tag" && a.tag) emit({ type: "remove_tag", tag: a.tag });
          if (a.kind === "set_field" && a.field)
            emit({ type: "set_field", field: a.field, value: renderTemplate(a.value ?? "", contact) });
          if (a.kind === "handoff") emit({ type: "handoff" });
          if (a.kind === "webhook" && a.url)
            emit({
              type: "webhook",
              url: a.url,
              body: { flowId: state.flowId, nodeId: node.id, contact },
            });
        }
        state.nodeId = nextTarget(graph, node.id);
        break;
      }

      case "delay": {
        const d = node.data as DelayData;
        const target = nextTarget(graph, node.id);
        if (!target) {
          state.nodeId = null;
          break;
        }
        const minutes = Math.max(1, Math.min(60 * 23, Math.round(d.minutes || 1)));
        emit({ type: "schedule", minutes, nodeId: target });
        state.nodeId = target;
        state.status = "scheduled";
        break;
      }

      case "ai": {
        const d = node.data as AiData;
        emit({
          type: "ai_reply",
          nodeId: node.id,
          systemPrompt: d.systemPrompt,
          userText: typeof state.vars.__lastText === "string" ? state.vars.__lastText : undefined,
          viaCommentId,
        });
        markPrivateReply();
        if (d.conversational) {
          state.status = "waiting_ai";
          state.aiTurns = 0;
        } else {
          state.nodeId = nextTarget(graph, node.id);
        }
        break;
      }
    }
  }

  return done();
}
