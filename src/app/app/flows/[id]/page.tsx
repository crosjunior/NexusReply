import { notFound } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { FlowBuilder } from "@/components/builder/FlowBuilder";
import type { FlowGraph } from "@/lib/engine/types";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspaceId } = await requireSession();

  const { data: flow } = await supabase
    .from("flows")
    .select("id, name, status, graph")
    .eq("id", id)
    .maybeSingle();

  if (!flow) notFound();

  // Busca bases de conhecimento cadastradas para o seletor do fluxo
  const { data: knowledgeBases } = await supabase
    .from("knowledge_bases")
    .select("id, name, category, objective")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // Busca conta do Instagram para dados realistas de avatar e username na simulação
  const { data: igAccount } = await supabase
    .from("ig_accounts")
    .select("id, name, username, profile_picture_url")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  return (
    <div className="fixed inset-0 z-30 bg-zinc-50 md:static md:z-auto md:h-full">
      <FlowBuilder
        flow={{ ...flow, graph: flow.graph as FlowGraph }}
        knowledgeBases={knowledgeBases ?? []}
        igAccount={igAccount ?? null}
      />
    </div>
  );
}
