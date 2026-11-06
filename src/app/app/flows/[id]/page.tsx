import { notFound } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { FlowBuilder } from "@/components/builder/FlowBuilder";
import type { FlowGraph } from "@/lib/engine/types";

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const { data: flow } = await supabase.from("flows").select("id, name, status, graph").eq("id", id).maybeSingle();
  if (!flow) notFound();
  return (
    <div className="fixed inset-0 z-30 bg-zinc-50 md:static md:z-auto md:h-full">
      <FlowBuilder flow={{ ...flow, graph: flow.graph as FlowGraph }} />
    </div>
  );
}
