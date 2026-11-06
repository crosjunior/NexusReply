"use client";

import { useRef, useState, useEffect } from "react";
import { RotateCcw, Send, X } from "lucide-react";
import { advance, createState } from "@/lib/engine/core";
import { matchesKeywords } from "@/lib/engine/matching";
import type { ContactSnapshot, Effect, EngineEvent, EngineState, EntryContext, FlowGraph, StartData } from "@/lib/engine/types";

type Bubble =
  | { kind: "user"; text: string }
  | { kind: "bot"; nodeId: string; text?: string; imageUrl?: string; buttons?: { id: string; title: string; type: string }[]; quick?: { id: string; title: string }[]; viaComment?: boolean }
  | { kind: "note"; text: string };

/** Roda o mesmo motor da produção no navegador, sem enviar nada ao Instagram. */
export function Simulator({ graph, onClose }: { graph: FlowGraph; onClose: () => void }) {
  const [mode, setMode] = useState<"dm" | "comment">("dm");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const state = useRef<EngineState | null>(null);
  const entry = useRef<EntryContext>({ type: "dm" });
  const contact = useRef<ContactSnapshot>({ tags: [], fields: {}, username: "cliente.teste", name: "Cliente Teste" });
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  const reset = () => {
    state.current = null;
    contact.current = { tags: [], fields: {}, username: "cliente.teste", name: "Cliente Teste" };
    setBubbles([]);
  };

  function apply(effects: Effect[], out: Bubble[]) {
    for (const e of effects) {
      if (e.type === "send") {
        out.push({ kind: "bot", nodeId: e.nodeId, text: e.message.text, imageUrl: e.message.imageUrl, buttons: e.message.buttons, quick: e.message.quickReplies, viaComment: !!e.viaCommentId });
      } else if (e.type === "add_tag") {
        contact.current.tags = [...new Set([...contact.current.tags, e.tag])];
        out.push({ kind: "note", text: `🏷️ tag adicionada: ${e.tag}` });
      } else if (e.type === "remove_tag") {
        contact.current.tags = contact.current.tags.filter((t) => t !== e.tag);
        out.push({ kind: "note", text: `🏷️ tag removida: ${e.tag}` });
      } else if (e.type === "set_field") {
        contact.current.fields = { ...contact.current.fields, [e.field]: e.value };
        out.push({ kind: "note", text: `📝 ${e.field} = ${String(e.value)}` });
      } else if (e.type === "handoff") out.push({ kind: "note", text: "🙋 conversa transferida para humano (bot pausa)" });
      else if (e.type === "webhook") out.push({ kind: "note", text: `🔗 webhook POST ${e.url}` });
      else if (e.type === "schedule") out.push({ kind: "note", text: `⏱️ aguardaria ${e.minutes} min (pulado no teste)` });
      else if (e.type === "ai_reply") out.push({ kind: "bot", nodeId: e.nodeId, text: "🤖 [resposta gerada pela IA aparece aqui]", viaComment: !!e.viaCommentId });
    }
  }

  function run(event: EngineEvent, out: Bubble[]): boolean {
    const st = event.type === "start" ? createState("sim") : state.current;
    if (!st) return false;
    let r = advance(graph, st, { contact: contact.current, entry: entry.current }, event);
    if (!r.consumed) return false;
    apply(r.effects, out);
    // delays: retoma na hora no simulador
    let guard = 0;
    while (r.state.status === "scheduled" && guard++ < 10) {
      r = advance(graph, r.state, { contact: contact.current, entry: entry.current }, { type: "resume" });
      apply(r.effects, out);
    }
    state.current = r.state;
    if (r.state.status === "waiting_any") out.push({ kind: "note", text: "⏸️ Meta exige que o usuário responda antes da próxima mensagem" });
    if (r.state.status === "completed") out.push({ kind: "note", text: "✓ fluxo concluído" });
    return true;
  }

  function triggers() {
    const start = graph.nodes.find((n) => n.type === "start");
    return (start?.data as StartData | undefined)?.triggers ?? [];
  }

  function onSend() {
    const t = text.trim();
    if (!t) return;
    setText("");
    const out: Bubble[] = [{ kind: "user", text: mode === "comment" ? `💬 comentou: "${t}"` : t }];

    if (mode === "comment") {
      const trig = triggers().find((x) => x.type === "comment_keyword" && matchesKeywords(t, x.keywords, x.match));
      if (!trig) out.push({ kind: "note", text: "Nenhum gatilho de comentário casou com esse texto." });
      else {
        if (trig.publicReplies?.length) out.push({ kind: "note", text: `↩️ resposta pública: "${trig.publicReplies[0]}"` });
        entry.current = { type: "comment", commentId: "sim_comment", text: t };
        run({ type: "start" }, out);
        setMode("dm");
      }
      setBubbles((b) => [...b, ...out]);
      return;
    }

    const handled = state.current && !["completed", "expired"].includes(state.current.status) && run({ type: "text", text: t }, out);
    if (!handled) {
      const kw = triggers().find((x) => x.type === "dm_keyword" && matchesKeywords(t, x.keywords, x.match));
      const def = triggers().find((x) => x.type === "default_reply");
      if (kw || def) {
        entry.current = { type: "dm", text: t };
        run({ type: "start" }, out);
      } else out.push({ kind: "note", text: "Nenhum gatilho de DM casou — em produção, nada seria enviado." });
    }
    setBubbles((b) => [...b, ...out]);
  }

  function click(nodeId: string, handleId: string, title: string) {
    const out: Bubble[] = [{ kind: "user", text: title }];
    if (!state.current) state.current = createState("sim");
    run({ type: "postback", nodeId, handleId }, out);
    setBubbles((b) => [...b, ...out]);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <span className="font-medium">Testar fluxo</span>
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">simulação</span>
        <button className="btn-ghost ml-auto px-2" onClick={reset} title="Recomeçar">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className="btn-ghost px-2" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-3">
        {bubbles.length === 0 && (
          <p className="mt-6 text-center text-xs text-zinc-500">
            Envie uma DM ou simule um comentário com a palavra-chave para ver o fluxo rodando com o mesmo motor da produção.
          </p>
        )}
        {bubbles.map((b, i) =>
          b.kind === "note" ? (
            <p key={i} className="text-center text-[11px] text-zinc-500">{b.text}</p>
          ) : b.kind === "user" ? (
            <div key={i} className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">{b.text}</div>
          ) : (
            <div key={i} className="max-w-[85%] space-y-1">
              {b.viaComment && <div className="text-[10px] text-zinc-400">private reply ao comentário</div>}
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.imageUrl} alt="" className="max-h-40 rounded-xl" />
              )}
              {b.text && <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm shadow-sm">{b.text}</div>}
              {b.buttons?.map((btn) => (
                <button
                  key={btn.id}
                  disabled={btn.type === "url"}
                  onClick={() => click(b.nodeId, btn.id, btn.title)}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:text-zinc-500"
                >
                  {btn.title} {btn.type === "url" && "↗"}
                </button>
              ))}
              {b.quick && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {b.quick.map((q) => (
                    <button key={q.id} onClick={() => click(b.nodeId, q.id, q.title)} className="rounded-full border border-brand-300 bg-white px-3 py-1 text-xs text-brand-700 hover:bg-brand-50">
                      {q.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <div className="space-y-2 border-t border-zinc-200 p-3">
        <div className="flex gap-1 text-xs">
          {(["dm", "comment"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 ${mode === m ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}
            >
              {m === "dm" ? "Mensagem (DM)" : "Comentário no post"}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "dm" ? "Digite uma mensagem…" : "Digite o comentário…"} />
          <button className="btn-primary px-3" aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
