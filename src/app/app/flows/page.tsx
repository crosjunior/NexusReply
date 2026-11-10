import Link from "next/link";
import { requireSession } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/flow-templates";
import { createFlow } from "../actions";
import { FlowRowActions } from "@/components/FlowRowActions";
import type { StartData, FlowGraph, MessageData, TriggerConfig } from "@/lib/engine/types";
import { Film, Image as ImageIcon, Sparkles, Clock, MessageSquare, ExternalLink } from "lucide-react";

const TRIGGER_LABEL: Record<string, string> = {
  comment_keyword: "Comentário",
  dm_keyword: "DM",
  story_reply: "Resposta ao story",
  story_mention: "Menção no story",
  default_reply: "Resposta padrão",
};

function getScheduleBadge(t?: TriggerConfig) {
  if (!t || t.scheduleType !== "scheduled") {
    return { label: "Permanente", className: "bg-zinc-100 text-zinc-600" };
  }
  const now = new Date();
  if (t.startsAt) {
    const s = new Date(t.startsAt);
    if (!isNaN(s.getTime()) && now < s) {
      return {
        label: `Agendada (${s.toLocaleDateString("pt-BR")})`,
        className: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    }
  }
  if (t.endsAt) {
    const e = new Date(t.endsAt);
    if (!isNaN(e.getTime())) {
      if (now > e) {
        return { label: "Encerrada", className: "bg-zinc-100 text-zinc-400" };
      }
      return {
        label: `Ativa até ${e.toLocaleDateString("pt-BR")}`,
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    }
  }
  return { label: "Agendada", className: "bg-emerald-50 text-emerald-700" };
}

export default async function FlowsPage() {
  const { supabase, workspaceId } = await requireSession();
  const { data: flows } = await supabase
    .from("flows")
    .select("id, name, status, graph, runs_count, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Automações & Regras</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gerencie fluxos automáticos de resposta para comentários e DMs do Instagram e WhatsApp.
          </p>
        </div>
      </div>

      <form action={createFlow} className="card space-y-4 p-5 bg-gradient-to-br from-white to-zinc-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">Nome da Nova Regra / Fluxo</label>
            <input
              name="name"
              required
              className="input text-sm"
              placeholder="Ex.: Comentou 'QUERO' no Reels de Metas"
            />
          </div>
          <button className="btn-primary text-xs py-2 px-4 whitespace-nowrap">+ Criar Nova Regra</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {TEMPLATES.map((t, i) => (
            <label
              key={t.key}
              className="cursor-pointer rounded-lg border border-zinc-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 transition-colors"
            >
              <input type="radio" name="template" value={t.key} defaultChecked={i === 1} className="sr-only" />
              <div className="font-semibold text-zinc-900">{t.name}</div>
              <div className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{t.description}</div>
            </label>
          ))}
        </div>
      </form>

      <div className="card divide-y divide-zinc-100 overflow-hidden">
        {(flows ?? []).length === 0 && (
          <p className="p-8 text-center text-sm text-zinc-500">Nenhum fluxo criado ainda.</p>
        )}
        {(flows ?? []).map((f) => {
          const graph = f.graph as FlowGraph;
          const start = graph.nodes.find((n) => n.type === "start");
          const triggers = ((start?.data as StartData | undefined)?.triggers ?? []) as TriggerConfig[];
          const primaryTrigger = triggers[0];
          const targetMedia = triggers.find((t) => t.targetMedia)?.targetMedia;
          const postUrl = targetMedia?.permalink || (targetMedia?.id ? `https://www.instagram.com/p/${targetMedia.id}/` : undefined);
          const schedule = getScheduleBadge(primaryTrigger);

          // Primeira mensagem configurada no fluxo
          const firstMsgNode = graph.nodes.find((n) => n.type === "message");
          const msgPreview = (firstMsgNode?.data as MessageData | undefined)?.text?.slice(0, 60);

          return (
            <div key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center hover:bg-zinc-50/40 transition-colors">
              {/* Miniatura da Publicação Alvo (se houver post específico) */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {targetMedia?.thumbnail_url ? (
                  postUrl ? (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-purple-200 bg-zinc-100 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all block"
                      title="Abrir publicação no Instagram"
                    >
                      <img
                        src={targetMedia.thumbnail_url}
                        alt="Capa"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center uppercase py-0.2">
                        {targetMedia.media_type}
                      </span>
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ExternalLink className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    </a>
                  ) : (
                    <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-purple-200 bg-zinc-100 shadow-sm">
                      <img
                        src={targetMedia.thumbnail_url}
                        alt="Capa"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center uppercase py-0.2">
                        {targetMedia.media_type}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 border border-zinc-200">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/flows/${f.id}`}
                      className="truncate font-bold text-sm text-zinc-900 hover:text-brand-600 transition-colors"
                    >
                      {f.name}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        f.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : f.status === "paused"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      ● {f.status === "published" ? "Ativo" : f.status === "paused" ? "Pausado" : "Rascunho"}
                    </span>
                  </div>

                  {/* Detalhes do Alvo, Gatilhos e Mensagens */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                    {/* Alvo: Post específico ou Qualquer Publicação */}
                    {targetMedia ? (
                      postUrl ? (
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1 rounded bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 text-[10px] font-semibold hover:bg-purple-100 hover:text-purple-900 hover:border-purple-300 transition-all shadow-2xs"
                          title={`Abrir publicação no Instagram: ${targetMedia.caption || ""}`}
                        >
                          <span>📸 Post: {(targetMedia.caption || "ID").slice(0, 30)}...</span>
                          <ExternalLink className="h-2.5 w-2.5 text-purple-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      ) : (
                        <span className="rounded bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 text-[10px] font-medium" title={targetMedia.caption}>
                          📸 Post: {(targetMedia.caption || "ID").slice(0, 30)}...
                        </span>
                      )
                    ) : (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                        🎯 Qualquer Publicação
                      </span>
                    )}

                    {/* Vigência */}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${schedule.className}`}>
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                      {schedule.label}
                    </span>

                    {/* Palavras-chave */}
                    {triggers.map((t) => (
                      <span key={t.id} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                        {TRIGGER_LABEL[t.type]}
                        {t.keywords.length > 0 && t.match !== "any" ? `: "${t.keywords.slice(0, 2).join('", "')}"` : ""}
                      </span>
                    ))}
                  </div>

                  {/* Prévia da Mensagem */}
                  {msgPreview && (
                    <Link
                      href={`/app/flows/${f.id}`}
                      className="mt-1 text-[11px] text-zinc-400 hover:text-zinc-600 line-clamp-1 flex items-center gap-1 transition-colors block"
                    >
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      &quot;{msgPreview}...&quot;
                    </Link>
                  )}
                </div>
              </div>

              {/* Contagem de Execuções */}
              <div className="hidden text-right text-xs text-zinc-500 md:block min-w-24">
                <span className="font-bold text-zinc-800 text-sm block">{f.runs_count}</span>
                execuções
              </div>

              {/* Botões de Ação com Indicadores */}
              <FlowRowActions id={f.id} name={f.name} status={f.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
