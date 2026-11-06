"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bot, Send, User, CheckCheck, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markRead, sendAgentMessage, setConversationStatus } from "@/app/app/actions";

interface Conv {
  id: string;
  status: "bot" | "human" | "closed";
  channel?: "instagram" | "whatsapp";
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  contacts: {
    id: string;
    username: string | null;
    name: string | null;
    phone_number?: string | null;
    channel?: "instagram" | "whatsapp";
    profile_pic: string | null;
    tags: string[];
    last_interaction_at: string | null;
  } | null;
}

interface Msg {
  id: string;
  conversation_id: string;
  direction: "in" | "out";
  source: string;
  kind: string;
  text: string | null;
  payload: { buttons?: { title: string }[]; quickReplies?: { title: string }[] } | null;
  created_at: string;
}

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "human", label: "Humano" },
  { key: "bot", label: "Bot" },
  { key: "closed", label: "Fechadas" },
] as const;

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function Inbox({ workspaceId }: { workspaceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const loadConvs = useCallback(async () => {
    let q = supabase
      .from("conversations")
      .select("id, status, channel, last_message_at, last_message_preview, unread_count, contacts(id, username, name, phone_number, channel, profile_pic, tags, last_interaction_at)")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setConvs((data as unknown as Conv[]) ?? []);
  }, [supabase, workspaceId, filter]);

  const loadMsgs = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("messages")
        .select("id, conversation_id, direction, source, kind, text, payload, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(300);
      setMsgs((data as Msg[]) ?? []);
    },
    [supabase],
  );

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (!activeId) return;
    loadMsgs(activeId);
    markRead(activeId);
  }, [activeId, loadMsgs]);

  // Realtime: novas mensagens e mudanas nas conversas
  useEffect(() => {
    const ch = supabase
      .channel(`inbox:${workspaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `workspace_id=eq.${workspaceId}` }, (p) => {
        const m = p.new as Msg;
        if (m.conversation_id === activeRef.current) setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        loadConvs();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `workspace_id=eq.${workspaceId}` }, () => loadConvs())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, workspaceId, loadConvs]);

  useEffect(() => {
    end.current?.scrollIntoView();
  }, [msgs]);

  const active = convs.find((c) => c.id === activeId);
  const isWa = active?.channel === "whatsapp" || active?.contacts?.channel === "whatsapp";
  const lastUser = active?.contacts?.last_interaction_at ? new Date(active.contacts.last_interaction_at).getTime() : 0;
  const windowState = Date.now() - lastUser < 24 * 3600_000 ? "open" : Date.now() - lastUser < 7 * 86400_000 ? "agent" : "closed";

  function send() {
    if (!activeId || !draft.trim()) return;
    const text = draft;
    setDraft("");
    setError(null);
    start(async () => {
      const r = await sendAgentMessage(activeId, text);
      if (!r.ok) {
        setError(r.error ?? "Erro ao enviar mensagem");
        setDraft(text);
      }
      loadMsgs(activeId);
    });
  }

  function getContactDisplay(c: Conv) {
    const isW = c.channel === "whatsapp" || c.contacts?.channel === "whatsapp";
    if (isW) {
      return c.contacts?.name || c.contacts?.phone_number || "WhatsApp";
    }
    return c.contacts?.username ? `@${c.contacts.username}` : (c.contacts?.name ?? "Usurio");
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-full">
      {/* Lista */}
      <section className={`w-full flex-col border-r border-zinc-200 bg-white md:flex md:w-80 ${activeId ? "hidden" : "flex"}`}>
        <div className="border-b border-zinc-200 p-3">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <div className="mt-2 flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-2.5 py-1 text-xs ${filter === f.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {convs.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">Nenhuma conversa.</li>}
          {convs.map((c) => {
            const isContactWa = c.channel === "whatsapp" || c.contacts?.channel === "whatsapp";
            return (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left hover:bg-zinc-50 ${activeId === c.id ? "bg-brand-50" : ""}`}
                >
                  <Avatar src={c.contacts?.profile_pic} name={getContactDisplay(c)} isWa={isContactWa} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{getContactDisplay(c)}</span>
                      {isContactWa ? (
                        <span className="shrink-0 rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-700">WA</span>
                      ) : (
                        <span className="shrink-0 rounded bg-purple-50 px-1 text-[9px] font-bold text-purple-700">IG</span>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] text-zinc-400">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs text-zinc-500">{c.last_message_preview}</span>
                      {c.status === "human" && <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] text-amber-800">humano</span>}
                      {c.unread_count > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{c.unread_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Conversa */}
      <section className={`min-w-0 flex-1 flex-col bg-zinc-50 ${activeId ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="m-auto text-sm text-zinc-500">Selecione uma conversa</div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
              <button className="btn-ghost px-2 md:hidden" onClick={() => setActiveId(null)} aria-label="Voltar">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Avatar src={active.contacts?.profile_pic} name={getContactDisplay(active)} isWa={isWa} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{getContactDisplay(active)}</span>
                  {isWa ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      WhatsApp
                    </span>
                  ) : (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                      Instagram
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-zinc-500">
                  {isWa && active.contacts?.phone_number && `${active.contacts.phone_number} · `}
                  {active.contacts?.tags?.length ? active.contacts.tags.join(" · ") : (active.contacts?.name ?? "")}
                </div>
              </div>
              {active.status === "bot" ? (
                <button className="btn-secondary text-xs" disabled={pending} onClick={() => start(() => setConversationStatus(active.id, "human").then(loadConvs))}>
                  <User className="h-4 w-4" /> Assumir
                </button>
              ) : (
                <button className="btn-secondary text-xs" disabled={pending} onClick={() => start(() => setConversationStatus(active.id, "bot").then(loadConvs))}>
                  <Bot className="h-4 w-4" /> Devolver ao bot
                </button>
              )}
              {active.status !== "closed" && (
                <button className="btn-ghost px-2" title="Fechar conversa" onClick={() => start(() => setConversationStatus(active.id, "closed").then(loadConvs))}>
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgs.map((m) =>
                m.source === "system" ? (
                  <p key={m.id} className="text-center text-[11px] text-zinc-500">{m.text}</p>
                ) : (
                  <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : ""}`}>
                    <div className="max-w-[75%]">
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                          m.direction === "out"
                            ? m.source === "agent"
                              ? "rounded-br-sm bg-zinc-900 text-white"
                              : isWa
                              ? "rounded-br-sm bg-emerald-600 text-white"
                              : "rounded-br-sm bg-brand-600 text-white"
                            : m.kind === "comment"
                              ? "rounded-bl-sm border border-dashed border-zinc-300 bg-white"
                              : "rounded-bl-sm bg-white shadow-sm"
                        }`}
                      >
                        {m.kind === "comment" && <span className="mb-0.5 block text-[10px] text-zinc-400">comentou no post</span>}
                        {m.text || `[${m.kind}]`}
                        {m.payload?.buttons?.map((b, i) => (
                          <span key={i} className="mt-1 block rounded-md bg-white/15 px-2 py-0.5 text-center text-xs">{b.title}</span>
                        ))}
                      </div>
                      <div className={`mt-0.5 text-[10px] text-zinc-400 ${m.direction === "out" ? "text-right" : ""}`}>
                        {m.direction === "out" ? (m.source === "agent" ? "equipe · " : "bot · ") : ""}
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ),
              )}
              <div ref={end} />
            </div>

            <div className="border-t border-zinc-200 bg-white p-3">
              {windowState !== "open" && (
                <p className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                  {windowState === "agent"
                    ? `Fora da janela de 24h: envio s como atendimento humano (at 7 dias).`
                    : `Mais de 7 dias sem interao: o canal no permite envio sem template oficial.`}
                </p>
              )}
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  className="input flex-1"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isWa ? "Responder no WhatsApp como equipe..." : "Responder no Instagram como equipe..."}
                  disabled={windowState === "closed"}
                />
                <button
                  className={`px-3 py-2 rounded-lg text-white font-medium text-sm flex items-center justify-center transition-colors ${
                    isWa ? "bg-emerald-600 hover:bg-emerald-700" : "btn-primary"
                  }`}
                  disabled={pending || windowState === "closed"}
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Avatar({ src, name, isWa }: { src?: string | null; name?: string | null; isWa?: boolean }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        isWa ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
      }`}
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
