"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Trash2, BarChart3, Edit3 } from "lucide-react";
import Link from "next/link";
import { deleteFlow, setFlowStatus } from "@/app/app/actions";
import { FlowMetricsModal } from "./FlowMetricsModal";

export function FlowRowActions({ id, name, status }: { id: string; name: string; status: string }) {
  const [pending, start] = useTransition();
  const [metricsOpen, setMetricsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Botão de Indicadores e Métricas de Execução */}
        <button
          className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 text-zinc-700 hover:text-brand-600 hover:border-brand-200"
          title="Ver Indicadores e Métricas de Execução"
          onClick={() => setMetricsOpen(true)}
        >
          <BarChart3 className="h-3.5 w-3.5 text-brand-600" />
          <span className="hidden sm:inline">Indicadores</span>
        </button>

        {/* Botão Editar */}
        <Link
          href={`/app/flows/${id}`}
          className="btn-ghost px-2 text-zinc-500 hover:text-zinc-900"
          title="Editar fluxo"
        >
          <Edit3 className="h-4 w-4" />
        </Link>

        {/* Pausar / Ativar */}
        {status !== "draft" && (
          <button
            className="btn-ghost px-2 text-zinc-500 hover:text-zinc-900"
            disabled={pending}
            title={status === "published" ? "Pausar regra" : "Reativar regra"}
            onClick={() => start(() => setFlowStatus(id, status === "published" ? "paused" : "published"))}
          >
            {status === "published" ? <Pause className="h-4 w-4 text-amber-600" /> : <Play className="h-4 w-4 text-emerald-600" />}
          </button>
        )}

        {/* Excluir */}
        <button
          className="btn-ghost px-2 text-zinc-400 hover:text-red-600"
          disabled={pending}
          title="Excluir regra"
          onClick={() => confirm(`Excluir permanentemente o fluxo "${name}"?`) && start(() => deleteFlow(id))}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <FlowMetricsModal
        flowId={id}
        flowName={name}
        isOpen={metricsOpen}
        onClose={() => setMetricsOpen(false)}
      />
    </>
  );
}
