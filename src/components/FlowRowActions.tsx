"use client";

import { useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { deleteFlow, setFlowStatus } from "@/app/app/actions";

export function FlowRowActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center">
      {status !== "draft" && (
        <button
          className="btn-ghost px-2"
          disabled={pending}
          title={status === "published" ? "Pausar" : "Reativar"}
          onClick={() => start(() => setFlowStatus(id, status === "published" ? "paused" : "published"))}
        >
          {status === "published" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      )}
      <button
        className="btn-ghost px-2 hover:text-red-600"
        disabled={pending}
        title="Excluir"
        onClick={() => confirm("Excluir este fluxo?") && start(() => deleteFlow(id))}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
