/**
 * Modelo de fluxo (o que o builder salva) e tipos do motor.
 * O grafo segue o formato do React Flow: nodes + edges com sourceHandle.
 */

export type NodeType =
  | "start"
  | "message"
  | "input"
  | "condition"
  | "action"
  | "delay"
  | "ai";

export type TriggerType =
  | "comment_keyword"
  | "dm_keyword"
  | "story_reply"
  | "story_mention"
  | "default_reply";

export type MatchMode = "contains" | "exact" | "any";

export interface TargetMedia {
  id: string;
  media_type: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp?: string;
  permalink?: string;
}

export interface TriggerConfig {
  id: string;
  type: TriggerType;
  keywords: string[];
  match: MatchMode;
  /** Apenas para comentários/DMs: limitar a posts/reels específicos (vazio = todos) */
  mediaIds?: string[];
  /** Detalhes visuais do post/reels/story selecionado */
  targetMedia?: TargetMedia;
  /** Respostas públicas ao comentário (uma é sorteada) */
  publicReplies?: string[];
  /** default_reply: não repetir para o mesmo contato dentro de N horas */
  cooldownHours?: number;
  /** Vigência da regra: permanente ou agendada com início e fim */
  scheduleType?: "permanent" | "scheduled";
  startsAt?: string;
  endsAt?: string;
}

export interface Button {
  id: string;
  title: string;
  type: "postback" | "url";
  url?: string;
}

export interface QuickReply {
  id: string;
  title: string;
}

export interface StartData {
  triggers: TriggerConfig[];
}

export interface MessageData {
  text: string;
  imageUrl?: string;
  buttons: Button[];
  quickReplies: QuickReply[];
}

export interface InputData {
  question: string;
  field: string;
  validation: "text" | "email" | "phone" | "number";
  retryMessage: string;
  /** IG não tem campo nativo de e-mail: usamos quick reply opcional para "pular" */
  skipLabel?: string;
}

export type ConditionOp =
  | "has_tag"
  | "not_has_tag"
  | "field_equals"
  | "field_contains"
  | "field_exists";

export interface ConditionData {
  op: ConditionOp;
  tag?: string;
  field?: string;
  value?: string;
}

export type ActionKind = "add_tag" | "remove_tag" | "set_field" | "handoff" | "webhook";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  tag?: string;
  field?: string;
  value?: string;
  url?: string;
}

export interface ActionData {
  actions: ActionItem[];
}

export interface DelayData {
  minutes: number;
}

export interface AiData {
  /** Instruções do assistente (persona, base de conhecimento curta) */
  systemPrompt: string;
  /** Se true, espera a próxima mensagem do usuário e responde com IA (modo conversa) */
  conversational: boolean;
  /** Número máximo de turnos no modo conversa */
  maxTurns: number;
}

export type NodeDataMap = {
  start: StartData;
  message: MessageData;
  input: InputData;
  condition: ConditionData;
  action: ActionData;
  delay: DelayData;
  ai: AiData;
};

export interface FlowNode<T extends NodeType = NodeType> {
  id: string;
  type: T;
  position: { x: number; y: number };
  data: NodeDataMap[T] & { label?: string };
}

export interface FlowEdge {
  id: string;
  source: string;
  /** "next" | id do botão | id do quick reply | "true" | "false" | "skip" */
  sourceHandle?: string | null;
  target: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ---------------------------------------------------------------------
// Estado de execução
// ---------------------------------------------------------------------

export type SessionStatus =
  | "running"
  | "waiting_click" // enviou botões/quick replies, aguarda clique
  | "waiting_input" // aguardando resposta livre (nó input)
  | "waiting_any" // após private reply: aguarda o usuário abrir a janela
  | "waiting_ai" // modo conversa com IA
  | "scheduled" // delay ou rate limit
  | "completed"
  | "expired";

export interface EngineState {
  flowId: string;
  nodeId: string | null;
  status: SessionStatus;
  vars: Record<string, unknown>;
  /** Private reply já usado e usuário ainda não interagiu depois */
  privateReplyPending: boolean;
  /** Turnos de IA consumidos no nó atual */
  aiTurns?: number;
  steps: number;
}

export interface ContactSnapshot {
  tags: string[];
  fields: Record<string, unknown>;
  username?: string | null;
  name?: string | null;
}

export interface EntryContext {
  type: "dm" | "comment" | "story_reply" | "story_mention" | "postback";
  commentId?: string;
  mediaId?: string;
  text?: string;
}

export type EngineEvent =
  | { type: "start" }
  | { type: "text"; text: string }
  | { type: "postback"; nodeId: string; handleId: string }
  | { type: "resume" };

/** Mensagem neutra (convertida para o payload da Graph API no runtime) */
export interface OutboundMessage {
  text?: string;
  imageUrl?: string;
  buttons?: Button[];
  quickReplies?: QuickReply[];
}

export type Effect =
  | {
      type: "send";
      nodeId: string;
      message: OutboundMessage;
      /** Envia como private reply ao comentário */
      viaCommentId?: string;
    }
  | { type: "add_tag"; tag: string }
  | { type: "remove_tag"; tag: string }
  | { type: "set_field"; field: string; value: unknown }
  | { type: "handoff" }
  | { type: "webhook"; url: string; body: Record<string, unknown> }
  | { type: "schedule"; minutes: number; nodeId: string }
  | {
      type: "ai_reply";
      nodeId: string;
      systemPrompt: string;
      userText?: string;
      viaCommentId?: string;
    };

export interface AdvanceResult {
  state: EngineState;
  effects: Effect[];
}

export const MAX_STEPS_PER_RUN = 50;
