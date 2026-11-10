import type { FlowGraph, MessageData, StartData } from "./types";

export interface Issue {
  nodeId?: string;
  level: "error" | "warning";
  message: string;
}

/** Validação usada no builder (avisos ao vivo) e no publish (bloqueia erros). */
export function validateGraph(graph: FlowGraph): Issue[] {
  const issues: Issue[] = [];
  const starts = graph.nodes.filter((n) => n.type === "start");
  if (starts.length !== 1) issues.push({ level: "error", message: "O fluxo precisa de exatamente um nó Início." });
  const start = starts[0];
  if (start) {
    const d = start.data as StartData;
    if (!d.triggers?.length) issues.push({ nodeId: start.id, level: "error", message: "Adicione ao menos um gatilho no Início." });
    for (const t of d.triggers ?? []) {
      const needsKw = t.type === "comment_keyword" || t.type === "dm_keyword" || t.type === "story_reply";
      if (needsKw && t.match !== "any" && !t.keywords.filter(Boolean).length)
        issues.push({ nodeId: start.id, level: "error", message: "Gatilho sem palavra-chave (ou use 'qualquer mensagem')." });
    }
    if (!graph.edges.some((e) => e.source === start.id))
      issues.push({ nodeId: start.id, level: "error", message: "Conecte o Início ao primeiro passo." });

    const first = graph.nodes.find((n) => n.id === graph.edges.find((e) => e.source === start.id)?.target);
    const hasComment = (d.triggers ?? []).some((t) => t.type === "comment_keyword");
    if (hasComment && first?.type === "message") {
      const m = first.data as MessageData;
      const interactive = m.buttons.some((b) => b.type === "postback") || m.quickReplies.length > 0;
      if (!interactive)
        issues.push({
          nodeId: first.id,
          level: "warning",
          message: "Gatilho de comentário: a 1ª mensagem deve ter um botão ou resposta rápida — a Meta só libera novas mensagens depois que o usuário interage.",
        });
      if (m.imageUrl)
        issues.push({ nodeId: first.id, level: "warning", message: "Imagem não é enviada no 1º private reply (só texto e botões)." });
    }

    if (hasComment && first?.type === "input") {
      issues.push({
        nodeId: first.id,
        level: "warning",
        message: "Início conectado a uma Pergunta: O usuário receberá a pergunta no Direct (DM). Os próximos passos (como a IA) só serão ativados após ele responder digitando no Direct.",
      });
    }

    if (first?.type === "input") {
      const nextAfterInput = graph.nodes.find((n) => n.id === graph.edges.find((e) => e.source === first.id && (e.sourceHandle ?? "next") === "next")?.target);
      if (nextAfterInput?.type === "ai") {
        issues.push({
          nodeId: nextAfterInput.id,
          level: "warning",
          message: "A IA está após a Pergunta: ela só começará a responder dúvidas depois que o contato digitar a resposta da pergunta no Direct.",
        });
      }
    }
  }

  for (const n of graph.nodes) {
    if (n.type === "message") {
      const m = n.data as MessageData;
      if (!m.text?.trim() && !m.imageUrl) issues.push({ nodeId: n.id, level: "error", message: "Mensagem vazia." });
      if (m.buttons.length > 3) issues.push({ nodeId: n.id, level: "error", message: "Máximo de 3 botões por mensagem." });
      if (m.buttons.length && (m.text?.length ?? 0) > 640)
        issues.push({ nodeId: n.id, level: "error", message: "Com botões, o texto deve ter até 640 caracteres." });
      if ((m.text?.length ?? 0) > 1000) issues.push({ nodeId: n.id, level: "error", message: "Texto acima de 1000 caracteres." });
      for (const b of m.buttons) {
        if (!b.title.trim()) issues.push({ nodeId: n.id, level: "error", message: "Botão sem título." });
        if (b.title.length > 20) issues.push({ nodeId: n.id, level: "warning", message: `Botão "${b.title}" será cortado em 20 caracteres.` });
        if (b.type === "url" && !/^https:\/\//.test(b.url ?? ""))
          issues.push({ nodeId: n.id, level: "error", message: `Botão "${b.title}" precisa de URL https://` });
        if (b.type === "postback" && !graph.edges.some((e) => e.source === n.id && e.sourceHandle === b.id))
          issues.push({ nodeId: n.id, level: "warning", message: `Botão "${b.title}" não está conectado.` });
      }
      if (m.quickReplies.length > 13) issues.push({ nodeId: n.id, level: "error", message: "Máximo de 13 respostas rápidas." });
    }
    if (n.type === "input" && !(n.data as { field: string }).field?.trim())
      issues.push({ nodeId: n.id, level: "error", message: "Informe o campo onde salvar a resposta." });
  }
  return issues;
}
