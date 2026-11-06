import { describe, expect, it } from "vitest";
import { advance, createState, decodePayload, encodePayload, renderTemplate, validateInput } from "./core";
import { matchesKeywords, pickTrigger } from "./matching";
import type { FlowGraph } from "./types";
import { commentToDmTemplate, leadCaptureTemplate } from "../flow-templates";

const contact = { tags: [], fields: {}, username: "maria.silva", name: "Maria Silva" };

const graph: FlowGraph = {
  nodes: [
    { id: "s", type: "start", position: { x: 0, y: 0 }, data: { triggers: [] } },
    {
      id: "m1",
      type: "message",
      position: { x: 0, y: 0 },
      data: {
        text: "Oi {{first_name}}! Quer o link?",
        buttons: [{ id: "b1", title: "Quero", type: "postback" }],
        quickReplies: [],
      },
    },
    {
      id: "m2",
      type: "message",
      position: { x: 0, y: 0 },
      data: {
        text: "Aqui está",
        buttons: [{ id: "u1", title: "Abrir", type: "url", url: "https://x.com" }],
        quickReplies: [],
      },
    },
    {
      id: "a1",
      type: "action",
      position: { x: 0, y: 0 },
      data: { actions: [{ id: "x", kind: "add_tag", tag: "lead" }] },
    },
    {
      id: "i1",
      type: "input",
      position: { x: 0, y: 0 },
      data: { question: "Seu e-mail?", field: "email", validation: "email", retryMessage: "E-mail inválido" },
    },
    {
      id: "c1",
      type: "condition",
      position: { x: 0, y: 0 },
      data: { op: "has_tag", tag: "lead" },
    },
    { id: "m3", type: "message", position: { x: 0, y: 0 }, data: { text: "Valeu {{field.email}}", buttons: [], quickReplies: [] } },
  ],
  edges: [
    { id: "e1", source: "s", target: "m1" },
    { id: "e2", source: "m1", sourceHandle: "b1", target: "m2" },
    { id: "e3", source: "m2", target: "a1" },
    { id: "e4", source: "a1", target: "i1" },
    { id: "e5", source: "i1", target: "c1" },
    { id: "e6", source: "c1", sourceHandle: "true", target: "m3" },
  ],
};

describe("engine core", () => {
  it("fluxo de comentário: 1º envio é private reply e aguarda clique", () => {
    const r = advance(graph, createState("f"), { contact, entry: { type: "comment", commentId: "C1" } }, { type: "start" });
    expect(r.effects).toHaveLength(1);
    expect(r.effects[0]).toMatchObject({ type: "send", viaCommentId: "C1", message: { text: "Oi Maria! Quer o link?" } });
    expect(r.state.status).toBe("waiting_click");
    expect(r.state.privateReplyPending).toBe(true);
  });

  it("clique no botão continua, aplica tag e para no input", () => {
    const s1 = advance(graph, createState("f"), { contact, entry: { type: "comment", commentId: "C1" } }, { type: "start" });
    const r = advance(graph, s1.state, { contact, entry: { type: "comment", commentId: "C1" } }, { type: "postback", nodeId: "m1", handleId: "b1" });
    const sends = r.effects.filter((e) => e.type === "send");
    expect(sends.every((e) => e.type === "send" && !e.viaCommentId)).toBe(true);
    expect(r.effects.map((e) => e.type)).toEqual(["send", "add_tag", "send"]);
    expect(r.state.status).toBe("waiting_input");
    expect(r.state.nodeId).toBe("i1");
  });

  it("input valida e-mail, salva campo e segue condição", () => {
    let st = advance(graph, createState("f"), { contact, entry: { type: "dm" } }, { type: "start" }).state;
    st = advance(graph, st, { contact, entry: { type: "dm" } }, { type: "postback", nodeId: "m1", handleId: "b1" }).state;
    const bad = advance(graph, st, { contact: { ...contact, tags: ["lead"] }, entry: { type: "dm" } }, { type: "text", text: "abc" });
    expect(bad.effects[0]).toMatchObject({ type: "send", message: { text: "E-mail inválido" } });
    expect(bad.state.status).toBe("waiting_input");
    const ok = advance(graph, st, { contact: { ...contact, tags: ["lead"] }, entry: { type: "dm" } }, { type: "text", text: "m@x.com" });
    expect(ok.effects[0]).toMatchObject({ type: "set_field", field: "email", value: "m@x.com" });
    expect(ok.effects[1]).toMatchObject({ type: "send", message: { text: "Valeu m@x.com" } });
    expect(ok.state.status).toBe("completed");
  });

  it("após private reply, um segundo envio sem interação bloqueia em waiting_any", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "s", type: "start", position: { x: 0, y: 0 }, data: { triggers: [] } },
        { id: "m1", type: "message", position: { x: 0, y: 0 }, data: { text: "1", buttons: [], quickReplies: [] } },
        { id: "m2", type: "message", position: { x: 0, y: 0 }, data: { text: "2", buttons: [], quickReplies: [] } },
      ],
      edges: [
        { id: "a", source: "s", target: "m1" },
        { id: "b", source: "m1", target: "m2" },
      ],
    };
    const r = advance(g, createState("f"), { contact, entry: { type: "comment", commentId: "C" } }, { type: "start" });
    expect(r.effects).toHaveLength(1);
    expect(r.state.status).toBe("waiting_any");
    expect(r.state.nodeId).toBe("m2");
    const r2 = advance(g, r.state, { contact, entry: { type: "comment", commentId: "C" } }, { type: "text", text: "oi" });
    expect(r2.effects[0]).toMatchObject({ type: "send", message: { text: "2" } });
    expect(r2.state.status).toBe("completed");
  });

  it("texto não relacionado não é consumido quando aguarda clique", () => {
    const st = advance(graph, createState("f"), { contact, entry: { type: "dm" } }, { type: "start" }).state;
    const r = advance(graph, st, { contact, entry: { type: "dm" } }, { type: "text", text: "qual o preço?" });
    expect(r.consumed).toBe(false);
  });

  it("loop no grafo é interrompido", () => {
    const g: FlowGraph = {
      nodes: [
        { id: "s", type: "start", position: { x: 0, y: 0 }, data: { triggers: [] } },
        { id: "a", type: "action", position: { x: 0, y: 0 }, data: { actions: [] } },
        { id: "b", type: "action", position: { x: 0, y: 0 }, data: { actions: [] } },
      ],
      edges: [
        { id: "1", source: "s", target: "a" },
        { id: "2", source: "a", target: "b" },
        { id: "3", source: "b", target: "a" },
      ],
    };
    const r = advance(g, createState("f"), { contact, entry: { type: "dm" } }, { type: "start" });
    expect(r.state.status).toBe("completed");
  });

  it("templates prontos executam sem erro", () => {
    for (const t of [commentToDmTemplate(), leadCaptureTemplate()]) {
      const r = advance(t, createState("f"), { contact, entry: { type: "comment", commentId: "C" } }, { type: "start" });
      expect(r.effects.length).toBeGreaterThan(0);
    }
  });
});

describe("helpers", () => {
  it("payload ida e volta", () => {
    expect(decodePayload(encodePayload("f", "n", "h"))).toEqual({ flowId: "f", nodeId: "n", handleId: "h" });
    expect(decodePayload("lixo")).toBeNull();
  });
  it("template de variáveis", () => {
    expect(renderTemplate("{{username}} {{field.x}}", { tags: [], fields: { x: 1 }, username: "u" })).toBe("u 1");
  });
  it("validação", () => {
    expect(validateInput("a@b.co", "email")).toBe(true);
    expect(validateInput("(31) 99999-0000", "phone")).toBe(true);
    expect(validateInput("abc", "number")).toBe(false);
  });
  it("keywords sem acento e palavra inteira", () => {
    expect(matchesKeywords("EU QUERO!!", ["eu quero"], "contains")).toBe(true);
    expect(matchesKeywords("Preço?", ["preco"], "contains")).toBe(true);
    expect(matchesKeywords("europa", ["eu"], "contains")).toBe(false);
    expect(matchesKeywords("link", ["link"], "exact")).toBe(true);
  });
  it("pickTrigger prioriza keyword sobre any", () => {
    const t = pickTrigger(
      [
        { id: "1", flow_id: "a", type: "comment_keyword", config: { match: "any" }, priority: 9 },
        { id: "2", flow_id: "b", type: "comment_keyword", config: { keywords: ["link"], match: "contains" }, priority: 0 },
      ],
      "comment_keyword",
      "me manda o link",
    );
    expect(t?.id).toBe("2");
  });
});
