import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  Bot,
  Plus,
  Sparkles,
  BookOpen,
  Calendar,
  Trash2,
  Power,
  Edit3,
  History,
} from "lucide-react";
import { toggleAgentStatus, deleteAgent } from "./actions";
import type { AgentGuardrails, AgentVersion } from "@/lib/agents/types";

export default async function AgentsPage() {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: agents } = await db
    .from("ai_agents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const list = agents ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-brand-600" />
            Agentes de Atendimento de IA
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Crie assistentes inteligentes treinados com a sua base de conhecimento para atender no WhatsApp e Instagram.
          </p>
        </div>
        <Link href="/app/agents/new" className="btn-primary flex items-center gap-2 text-xs py-2">
          <Plus className="h-4 w-4" /> Novo Agente de IA
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-base font-medium text-zinc-900">Nenhum agente criado ainda</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Crie seu primeiro agente de atendimento no assistente passo a passo e conecte-o ao WhatsApp e Instagram.
          </p>
          <div className="mt-6">
            <Link href="/app/agents/new" className="btn-primary text-xs">
              + Iniciar Criação de Agente
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((agent) => {
            const guardrails = (agent.guardrails || {}) as AgentGuardrails;
            const versions = Array.isArray(guardrails.versions) ? guardrails.versions : [];
            const activeVer = guardrails.active_version || (versions.length > 0 ? versions[versions.length - 1].version : 1);

            return (
              <div key={agent.id} className="card p-5 flex flex-col justify-between space-y-4 hover:border-zinc-300 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          agent.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        ● {agent.status === "active" ? "Ativo" : "Pausado"}
                      </span>
                      <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.2 text-[10px] font-bold text-brand-700">
                        v{activeVer}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {(agent.channels ?? []).map((ch: string) => (
                        <span key={ch} className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-bold uppercase text-zinc-600">
                          {ch === "whatsapp" ? "WA" : ch === "instagram" ? "IG" : "CHAT"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link href={`/app/agents/${agent.id}`} className="group block">
                    <h3 className="mt-3 text-base font-bold text-zinc-900 group-hover:text-brand-600 transition">
                      {agent.name}
                    </h3>
                  </Link>
                  {agent.role && <p className="text-xs text-zinc-500">{agent.role}</p>}

                  {agent.objective_description && (
                    <p className="mt-2 text-xs text-zinc-600 line-clamp-2">
                      {agent.objective_description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-brand-600" />
                      <span>{(agent.knowledge_base_ids ?? []).length} bases de conhecimento</span>
                    </div>
                    {agent.calendar_connection_id && (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Agendamento de reuniões ativo</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <History className="h-3 w-3" />
                      <span>{versions.length || 1} {versions.length === 1 ? "versão gravada" : "versões gravadas"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/agents/${agent.id}`}
                      className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-semibold text-brand-700 bg-brand-50/70 hover:bg-brand-100 border-brand-200 transition"
                    >
                      <Edit3 className="h-3 w-3" />
                      Editar
                    </Link>

                    <form
                      action={toggleAgentStatus.bind(
                        null,
                        agent.id,
                        agent.status === "active" ? "paused" : "active"
                      )}
                    >
                      <button className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1">
                        <Power className="h-3 w-3" />
                        {agent.status === "active" ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                  </div>

                  <form action={deleteAgent.bind(null, agent.id)}>
                    <button className="btn-ghost text-red-500 hover:text-red-700 text-xs p-1.5" title="Excluir agente">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
