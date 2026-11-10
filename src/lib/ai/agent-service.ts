import { admin } from "../supabase/admin";
import { searchKnowledge } from "../knowledge/search";
import { createAppointment, getNextAvailableSlots } from "../calendar/service";

export interface AgentBlueprintInput {
  name: string;
  role?: string;
  targetAudience?: string;
  toneOfVoice?: string;
  primaryObjective?: string;
  objectiveDescription?: string;
  instructions?: string;
  knowledgeBaseIds?: string[];
  channels?: string[];
  guardrails?: {
    handoffKeywords?: string[];
    protectPricing?: boolean;
    splitMessages?: boolean;
  };
}

export interface AgentRow {
  id: string;
  workspace_id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  target_audience: string | null;
  tone_of_voice: string | null;
  primary_objective: string | null;
  objective_description: string | null;
  instructions: string | null;
  knowledge_base_ids: string[];
  channels: string[];
  calendar_connection_id: string | null;
  guardrails: Record<string, unknown>;
  status: "active" | "paused";
  created_at: string;
}

/**
 * Monta o prompt do sistema para o Agente de IA com base nas instrues,
 * tom de voz, regras de atendimento e contedo recuperado da Base de Conhecimento.
 */
export async function buildAgentPrompt(
  agent: AgentRow,
  userMessage: string
): Promise<string> {
  let knowledgeSnippet = "";

  if (agent.knowledge_base_ids && agent.knowledge_base_ids.length > 0) {
    const results = await searchKnowledge(
      agent.workspace_id,
      userMessage,
      agent.knowledge_base_ids,
      4
    );

    if (results.length > 0) {
      knowledgeSnippet = `\n--- BASE DE CONHECIMENTO DISPONVEL (Use estas informaes prioritariamente para responder) ---\n` +
        results.map((r, i) => `[Documento ${i + 1} - ${r.metadata.title || "Ref"}]:\n${r.content}`).join("\n\n") +
        `\n--------------------------------------------------------------------------------------------------\n`;
    }
  }

  const slots = await getNextAvailableSlots(agent.workspace_id, 2);
  const slotsSnippet = slots.map((s) => s.label).join(", ");

  return `Voc  ${agent.name}, assistente virtual inteligente e especialista em atendimento.
Papel: ${agent.role || "Atendente Consultivo"}
Pblico-alvo: ${agent.target_audience || "Clientes e interessados"}
Tom de voz: ${agent.tone_of_voice || "Cordial, gil e consultivo"}
Objetivo: ${agent.objective_description || "Tirar dvidas, qualificar e ajudar o usurio da melhor forma."}

Instrues Especficas:
${agent.instructions || "Responda de forma concisa, amigvel e natural. Use pargrafos curtos adequados para WhatsApp e Instagram Direct."}
${knowledgeSnippet}
Regras de Comportamento:
1. Se a informao estiver na Base de Conhecimento acima, responda com preciso baseando-se nela.
2. Se no souber a informao, seja honesto e sugira direcionar para um atendente humano.
3. Se o cliente solicitar agendamento ou reunio, voc pode sugerir os prximos horrios livres (${slotsSnippet}) e enviar o link virtual.
4. Mantenha respostas curtas e humanas, com at 3 pargrafos breves.
`.trim();
}

