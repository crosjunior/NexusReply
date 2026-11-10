import { requireSession } from "@/lib/supabase/server";
import { AgentWizard } from "@/components/agents/AgentWizard";

export default async function NewAgentPage() {
  const { supabase, workspaceId } = await requireSession();

  const [kbRes, calRes] = await Promise.all([
    supabase
      .from("knowledge_bases")
      .select("id, name, category, description, knowledge_documents(count)")
      .eq("workspace_id", workspaceId),
    supabase
      .from("calendar_connections")
      .select("id, provider, account_email")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
  ]);

  const knowledgeBases = (kbRes.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    description: b.description,
    docsCount: (b.knowledge_documents as unknown as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));

  const calendars = calRes.data ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Novo Agente de Atendimento com IA</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure seu atendente autônomo, vincule sua base de conhecimento e conecte aos canais de comunicação.
        </p>
      </div>

      <AgentWizard knowledgeBases={knowledgeBases} calendars={calendars} />
    </div>
  );
}

