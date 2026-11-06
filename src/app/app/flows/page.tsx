import Link from "next/link";
import { requireSession } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/flow-templates";
import { createFlow } from "../actions";
import { FlowRowActions } from "@/components/FlowRowActions";
import type { StartData, FlowGraph } from "@/lib/engine/types";

const TRIGGER_LABEL: Record<string, string> = {
  comment_keyword: "Comentário",
  dm_keyword: "DM",
  story_reply: "Resposta ao story",
  story_mention: "Menção no story",
  default_reply: "Resposta padrão",
};

export default async function FlowsPage() {
  const { supabase, workspaceId } = await requireSession();
  const { data: flows } = await supabase
    .from("flows")
    .select("id, name, status, graph, runs_count, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Fluxos</h1>

      <form action={createFlow} className="card space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label">Nome do novo fluxo</label>
            <input name="name" className="input" placeholder="Ex.: Comentou EU QUERO no reels" />
          </div>
          <button className="btn-primary">Criar fluxo</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {TEMPLATES.map((t, i) => (
            <label key={t.key} className="cursor-pointer rounded-lg border border-zinc-200 p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="template" value={t.key} defaultChecked={i === 1} className="sr-only" />
              <div className="font-medium">{t.name}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{t.description}</div>
            </label>
          ))}
        </div>
      </form>

      <div className="card divide-y divide-zinc-100">
        {(flows ?? []).length === 0 && <p className="p-6 text-center text-sm text-zinc-500">Nenhum fluxo ainda.</p>}
        {(flows ?? []).map((f) => {
          const start = (f.graph as FlowGraph).nodes.find((n) => n.type === "start");
          const triggers = (start?.data as StartData | undefined)?.triggers ?? [];
          return (
            <div key={f.id} className="flex items-center gap-3 p-4">
              <Link href={`/app/flows/${f.id}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {triggers.map((t) => (
                    <span key={t.id} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                      {TRIGGER_LABEL[t.type]}
                      {t.keywords.length > 0 && t.match !== "any" ? `: ${t.keywords.slice(0, 2).join(", ")}` : ""}
                    </span>
                  ))}
                </div>
              </Link>
              <div className="hidden text-right text-xs text-zinc-500 sm:block">
                {f.runs_count} execuções
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  f.status === "published" ? "bg-emerald-50 text-emerald-700" : f.status === "paused" ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {f.status === "published" ? "Ativo" : f.status === "paused" ? "Pausado" : "Rascunho"}
              </span>
              <FlowRowActions id={f.id} status={f.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
