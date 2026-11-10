import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AgentEditor } from "@/components/agents/AgentEditor";
import type { AgentData } from "@/lib/agents/types";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireSession();
  const db = admin();

  const [agentRes, kbRes, calRes] = await Promise.all([
    db
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single(),
    db
      .from("knowledge_bases")
      .select("id, name, category, description, knowledge_documents(count)")
      .eq("workspace_id", workspaceId),
    db
      .from("calendar_connections")
      .select("id, provider, account_email")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
  ]);

  if (agentRes.error || !agentRes.data) {
    notFound();
  }

  const agent = agentRes.data as unknown as AgentData;

  const knowledgeBases = (kbRes.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    description: b.description,
    docsCount:
      (b.knowledge_documents as unknown as Array<{ count: number }>)?.[0]
        ?.count ?? 0,
  }));

  const calendars = calRes.data ?? [];

  return (
    <AgentEditor
      agent={agent}
      knowledgeBases={knowledgeBases}
      calendars={calendars}
    />
  );
}

