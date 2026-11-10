"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import type { AgentVersion, AgentGuardrails } from "@/lib/agents/types";

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

  const initialVersion: AgentVersion = {
    version: 1,
    name: data.name.trim(),
    role: data.role?.trim() || null,
    target_audience: data.targetAudience?.trim() || null,
    tone_of_voice: data.toneOfVoice || "consultative",
    primary_objective: data.primaryObjective || "hybrid",
    objective_description: data.objectiveDescription?.trim() || null,
    instructions: data.instructions?.trim() || "",
    knowledge_base_ids: data.knowledgeBaseIds ?? [],
    channels: data.channels ?? ["instagram", "whatsapp"],
    calendar_connection_id: data.calendarConnectionId ?? null,
    guardrails: data.guardrails ?? {
      handoff_keywords: ["falar com humano", "especialista", "atendente humano"],
    },
    change_summary: "Versão inicial criada",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_active: true,
  };

  const guardrailsData: AgentGuardrails = {
    handoff_keywords: ["falar com humano", "especialista", "atendente humano"],
    ...(data.guardrails || {}),
    versions: [initialVersion],
    active_version: 1,
    draft: null,
  };

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
      guardrails: guardrailsData,
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
  revalidatePath(`/app/agents/${id}`);
}

/**
 * Publica uma nova versão do Agente.
 * Incrementa a versão, arquiva as versões anteriores e torna a nova versão a única ativa.
 * Os novos dados passam a funcionar em tempo real para os atendimentos.
 */
export async function publishAgentVersionAction(
  agentId: string,
  data: {
    name: string;
    role?: string;
    targetAudience?: string;
    toneOfVoice?: string;
    primaryObjective?: string;
    objectiveDescription?: string;
    instructions: string;
    knowledgeBaseIds: string[];
    channels: string[];
    calendarConnectionId?: string | null;
    guardrails?: Record<string, unknown>;
    changeSummary?: string;
  }
) {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: agent, error: fetchErr } = await db
    .from("ai_agents")
    .select("*")
    .eq("id", agentId)
    .eq("workspace_id", workspaceId)
    .single();

  if (fetchErr || !agent) return { ok: false, error: "Agente não encontrado" };

  const currentGuardrails = (agent.guardrails || {}) as AgentGuardrails;
  let versions: AgentVersion[] = Array.isArray(currentGuardrails.versions)
    ? [...currentGuardrails.versions]
    : [];

  // Se o agente ainda não tiver histórico de versões, cria a v1 com base no estado anterior
  if (versions.length === 0) {
    versions.push({
      version: 1,
      name: agent.name,
      role: agent.role,
      target_audience: agent.target_audience,
      tone_of_voice: agent.tone_of_voice || "consultative",
      primary_objective: agent.primary_objective || "hybrid",
      objective_description: agent.objective_description,
      instructions: agent.instructions || "",
      knowledge_base_ids: agent.knowledge_base_ids || [],
      channels: agent.channels || ["instagram", "whatsapp"],
      calendar_connection_id: agent.calendar_connection_id,
      guardrails: agent.guardrails,
      change_summary: "Versão inicial",
      published_at: agent.created_at || new Date().toISOString(),
      created_at: agent.created_at || new Date().toISOString(),
      is_active: false,
    });
  }

  // Desativa todas as versões anteriores
  versions = versions.map((v) => ({ ...v, is_active: false }));

  // Calcula o próximo número de versão incremental
  const nextVerNum = Math.max(...versions.map((v) => v.version), 0) + 1;

  const newVersion: AgentVersion = {
    version: nextVerNum,
    name: data.name.trim(),
    role: data.role?.trim() || null,
    target_audience: data.targetAudience?.trim() || null,
    tone_of_voice: data.toneOfVoice || "consultative",
    primary_objective: data.primaryObjective || "hybrid",
    objective_description: data.objectiveDescription?.trim() || null,
    instructions: data.instructions.trim(),
    knowledge_base_ids: data.knowledgeBaseIds ?? [],
    channels: data.channels ?? ["instagram", "whatsapp"],
    calendar_connection_id: data.calendarConnectionId ?? null,
    guardrails: data.guardrails ?? currentGuardrails,
    change_summary: data.changeSummary?.trim() || `Publicação da Versão ${nextVerNum}`,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_active: true, // Somente uma versão de cada agente fica ativa!
  };

  versions.push(newVersion);

  const updatedGuardrails: AgentGuardrails = {
    ...currentGuardrails,
    versions,
    active_version: nextVerNum,
    draft: null, // Limpa rascunho após publicar
  };

  // Atualiza no banco com os novos parâmetros em produção
  const { error: updateErr } = await db
    .from("ai_agents")
    .update({
      name: data.name.trim(),
      role: data.role?.trim() || null,
      target_audience: data.targetAudience?.trim() || null,
      tone_of_voice: data.toneOfVoice || "consultative",
      primary_objective: data.primaryObjective || "hybrid",
      objective_description: data.objectiveDescription?.trim() || null,
      instructions: data.instructions.trim(),
      knowledge_base_ids: data.knowledgeBaseIds ?? [],
      channels: data.channels ?? ["instagram", "whatsapp"],
      calendar_connection_id: data.calendarConnectionId ?? null,
      guardrails: updatedGuardrails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/app/agents");
  revalidatePath(`/app/agents/${agentId}`);
  return { ok: true, version: nextVerNum };
}

/**
 * Salva alterações como Rascunho sem publicar em produção.
 */
export async function saveAgentDraftAction(agentId: string, draftData: any) {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: agent, error } = await db
    .from("ai_agents")
    .select("guardrails")
    .eq("id", agentId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !agent) return { ok: false, error: "Agente não encontrado" };

  const currentGuardrails = (agent.guardrails || {}) as AgentGuardrails;
  currentGuardrails.draft = {
    ...draftData,
    saved_at: new Date().toISOString(),
  };

  await db
    .from("ai_agents")
    .update({ guardrails: currentGuardrails, updated_at: new Date().toISOString() })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);

  revalidatePath(`/app/agents/${agentId}`);
  return { ok: true };
}

/**
 * Restaura uma versão anterior do Agente (Rollback).
 * Gera uma nova versão ativa a partir da versão histórica escolhida.
 */
export async function rollbackAgentVersionAction(agentId: string, targetVersion: number) {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: agent, error } = await db
    .from("ai_agents")
    .select("*")
    .eq("id", agentId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !agent) return { ok: false, error: "Agente não encontrado" };

  const currentGuardrails = (agent.guardrails || {}) as AgentGuardrails;
  let versions: AgentVersion[] = Array.isArray(currentGuardrails.versions)
    ? [...currentGuardrails.versions]
    : [];

  const found = versions.find((v) => v.version === targetVersion);
  if (!found) return { ok: false, error: `Versão ${targetVersion} não encontrada` };

  const nextVerNum = Math.max(...versions.map((v) => v.version), 0) + 1;
  versions = versions.map((v) => ({ ...v, is_active: false }));

  const restoredVersion: AgentVersion = {
    ...found,
    version: nextVerNum,
    change_summary: `Restaurada a partir da Versão ${targetVersion}`,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_active: true,
  };

  versions.push(restoredVersion);

  const updatedGuardrails: AgentGuardrails = {
    ...currentGuardrails,
    versions,
    active_version: nextVerNum,
    draft: null,
  };

  await db
    .from("ai_agents")
    .update({
      name: found.name,
      role: found.role,
      target_audience: found.target_audience,
      tone_of_voice: found.tone_of_voice,
      primary_objective: found.primary_objective,
      objective_description: found.objective_description,
      instructions: found.instructions,
      knowledge_base_ids: found.knowledge_base_ids,
      channels: found.channels,
      calendar_connection_id: found.calendar_connection_id,
      guardrails: updatedGuardrails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);

  revalidatePath("/app/agents");
  revalidatePath(`/app/agents/${agentId}`);
  return { ok: true, version: nextVerNum };
}

export async function createQuickKnowledgeBaseAction(data: {
  name: string;
  category: string;
  docTitle: string;
  sourceType: string;
  content: string;
  url?: string;
}) {
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: base, error: baseErr } = await db
    .from("knowledge_bases")
    .insert({
      workspace_id: workspaceId,
      name: data.name.trim(),
      category: data.category.trim() || "Geral",
    })
    .select("id, name, category")
    .single();

  if (baseErr) throw new Error(baseErr.message);

  if (data.docTitle && (data.content || data.url)) {
    let textToParse = data.content.trim();
    if (data.sourceType === "url" && data.url) {
      try {
        const res = await fetch(data.url, {
          headers: { "User-Agent": "NexusReply-Crawler/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        textToParse = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        // fallback
      }
    }

    const { parseAndChunkContent } = await import("@/lib/knowledge/parser");
    const parsed = parseAndChunkContent(
      data.docTitle,
      data.sourceType as any,
      textToParse,
      data.url ? { url: data.url } : {}
    );

    const { data: doc } = await db
      .from("knowledge_documents")
      .insert({
        workspace_id: workspaceId,
        knowledge_base_id: base.id,
        title: data.docTitle,
        source_type: data.sourceType,
        file_size: textToParse.length,
        content_json: parsed.contentJson,
        chunks_count: parsed.chunks.length,
        status: "ready",
      })
      .select("id")
      .single();

    if (doc && parsed.chunks.length) {
      await db.from("knowledge_chunks").insert(
        parsed.chunks.map((c) => ({
          workspace_id: workspaceId,
          knowledge_base_id: base.id,
          document_id: doc.id,
          content: c.content,
          metadata: c.metadata,
        }))
      );
    }
  }

  revalidatePath("/app/knowledge");
  revalidatePath("/app/agents/new");
  return {
    ok: true,
    base: {
      id: base.id,
      name: base.name,
      category: base.category,
      description: null,
      docsCount: 1,
    },
  };
}

export async function deleteAgent(id: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db.from("ai_agents").delete().eq("id", id).eq("workspace_id", workspaceId);
  revalidatePath("/app/agents");
}
