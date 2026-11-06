import type { FlowGraph, FlowNode, NodeType, NodeDataMap } from "./engine/types";

export function uid(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultData<T extends NodeType>(type: T): NodeDataMap[T] {
  const d: { [K in NodeType]: NodeDataMap[K] } = {
    start: { triggers: [] },
    message: { text: "", buttons: [], quickReplies: [] },
    input: {
      question: "Qual o seu melhor e-mail?",
      field: "email",
      validation: "email",
      retryMessage: "Hmm, esse e-mail não parece válido. Pode conferir?",
    },
    condition: { op: "has_tag", tag: "" },
    action: { actions: [] },
    delay: { minutes: 5 },
    ai: {
      systemPrompt:
        "Você é o assistente da marca. Responda em português, de forma breve e simpática. Se não souber, diga que um humano vai responder.",
      conversational: false,
      maxTurns: 3,
    },
  };
  return structuredClone(d[type]);
}

export function makeNode<T extends NodeType>(
  type: T,
  position: { x: number; y: number },
  data?: Partial<NodeDataMap[T]>,
): FlowNode<T> {
  return { id: uid(type.slice(0, 3)), type, position, data: { ...defaultData(type), ...data } as FlowNode<T>["data"] };
}

export function emptyFlow(): FlowGraph {
  return { nodes: [makeNode("start", { x: 80, y: 160 })], edges: [] };
}

/** Clássico ManyChat: comenta palavra → DM com botão → link */
export function commentToDmTemplate(): FlowGraph {
  const start = makeNode("start", { x: 40, y: 160 }, {
    triggers: [
      {
        id: uid("t"),
        type: "comment_keyword",
        keywords: ["EU QUERO", "LINK"],
        match: "contains",
        publicReplies: ["Te mandei no direct! 📩", "Enviado na sua DM 😉", "Corre lá no direct! 🚀"],
      },
      { id: uid("t"), type: "dm_keyword", keywords: ["EU QUERO", "LINK"], match: "contains" },
    ],
  });
  const btn = uid("b");
  const m1 = makeNode("message", { x: 380, y: 120 }, {
    text: "Oi {{first_name}}! 👋 Vi seu comentário. Toque no botão abaixo que eu te envio o link agora.",
    buttons: [{ id: btn, title: "Quero o link", type: "postback" }],
  });
  const m2 = makeNode("message", { x: 720, y: 120 }, {
    text: "Aqui está! Qualquer dúvida é só responder por aqui.",
    buttons: [{ id: uid("b"), title: "Acessar", type: "url", url: "https://seusite.com.br" }],
  });
  const tag = makeNode("action", { x: 1060, y: 140 }, {
    actions: [{ id: uid("a"), kind: "add_tag", tag: "lead-comentario" }],
  });
  return {
    nodes: [start, m1, m2, tag],
    edges: [
      { id: uid("e"), source: start.id, sourceHandle: "next", target: m1.id },
      { id: uid("e"), source: m1.id, sourceHandle: btn, target: m2.id },
      { id: uid("e"), source: m2.id, sourceHandle: "next", target: tag.id },
    ],
  };
}

/** Captura de lead: pergunta e-mail, valida, salva e marca */
export function leadCaptureTemplate(): FlowGraph {
  const start = makeNode("start", { x: 40, y: 160 }, {
    triggers: [{ id: uid("t"), type: "dm_keyword", keywords: ["MATERIAL", "EBOOK"], match: "contains" }],
  });
  const qYes = uid("q");
  const qNo = uid("q");
  const m1 = makeNode("message", { x: 360, y: 120 }, {
    text: "Oba, {{first_name}}! Posso te enviar o material por e-mail?",
    quickReplies: [
      { id: qYes, title: "Sim, quero" },
      { id: qNo, title: "Agora não" },
    ],
  });
  const input = makeNode("input", { x: 700, y: 40 }, { skipLabel: "Pular" });
  const ok = makeNode("message", { x: 1040, y: 40 }, {
    text: "Perfeito! Enviei para {{field.email}}. ✅",
  });
  const tag = makeNode("action", { x: 1360, y: 60 }, {
    actions: [{ id: uid("a"), kind: "add_tag", tag: "lead-email" }],
  });
  const bye = makeNode("message", { x: 700, y: 260 }, { text: "Sem problemas! Se mudar de ideia, é só mandar MATERIAL." });
  return {
    nodes: [start, m1, input, ok, tag, bye],
    edges: [
      { id: uid("e"), source: start.id, sourceHandle: "next", target: m1.id },
      { id: uid("e"), source: m1.id, sourceHandle: qYes, target: input.id },
      { id: uid("e"), source: m1.id, sourceHandle: qNo, target: bye.id },
      { id: uid("e"), source: input.id, sourceHandle: "next", target: ok.id },
      { id: uid("e"), source: ok.id, sourceHandle: "next", target: tag.id },
    ],
  };
}

/** Resposta padrão com IA para qualquer DM sem gatilho */
export function aiDefaultTemplate(): FlowGraph {
  const start = makeNode("start", { x: 40, y: 160 }, {
    triggers: [{ id: uid("t"), type: "default_reply", keywords: [], match: "any", cooldownHours: 0 }],
  });
  const ai = makeNode("ai", { x: 380, y: 140 }, { conversational: true, maxTurns: 5 });
  const handoff = makeNode("action", { x: 720, y: 160 }, {
    actions: [{ id: uid("a"), kind: "handoff" }],
  });
  return {
    nodes: [start, ai, handoff],
    edges: [
      { id: uid("e"), source: start.id, sourceHandle: "next", target: ai.id },
      { id: uid("e"), source: ai.id, sourceHandle: "next", target: handoff.id },
    ],
  };
}

export const TEMPLATES = [
  { key: "blank", name: "Em branco", description: "Comece do zero", build: emptyFlow },
  {
    key: "comment_dm",
    name: "Comentário → DM",
    description: "Quem comentar a palavra-chave recebe o link no direct",
    build: commentToDmTemplate,
  },
  {
    key: "lead",
    name: "Captura de e-mail",
    description: "Pergunta, valida e salva o e-mail do contato",
    build: leadCaptureTemplate,
  },
  {
    key: "ai",
    name: "Atendente com IA",
    description: "Responde qualquer DM com IA e passa para humano",
    build: aiDefaultTemplate,
  },
] as const;
