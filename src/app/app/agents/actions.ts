"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

export async function createAgentFromWizard(data: {
  name: string;
  role?: string;
  targetAudience?: string;
  toneOfVoice?: string;
  primaryObjective?: string;
  objectiveDescription?: string;
  instructions?: string;
  knowledgeBaseIds?: string[];
  channels?: string[];
  calendarConnectionId?: string | null;
  guardrails?: Record<string, unknown>;
}) {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: agent, error } = await db
    .from("ai_agents")
    .insert({
      workspace_id: workspaceId,
      name: data.name.trim(),
      role: data.role?.trim() || null,
      target_audience: data.targetAudience?.trim() || null,
      tone_of_voice: data.toneOfVoice || "consultative",
      primary_objective: data.primaryObjective || "hybrid",
      objective_description: data.objectiveDescription?.trim() || null,
      instructions: data.instructions?.trim() || null,
      knowledge_base_ids: data.knowledgeBaseIds ?? [],
      channels: data.channels ?? ["instagram", "whatsapp"],
      calendar_connection_id: data.calendarConnectionId ?? null,
      guardrails: data.guardrails ?? {
        handoff_keywords: ["falar com humano", "especialista", "atendente humano"],
      },
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/agents");
  return { ok: true, id: agent.id };
}

export async function toggleAgentStatus(id: string, status: "active" | "paused") {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db
    .from("ai_agents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  revalidatePath("/app/agents");
}

export async function deleteAgent(id: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db.from("ai_agents").delete().eq("id", id).eq("workspace_id", workspaceId);
  revalidatePath("/app/agents");
}

