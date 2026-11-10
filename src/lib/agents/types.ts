export interface AgentVersion {
  version: number;
  name: string;
  role?: string | null;
  target_audience?: string | null;
  tone_of_voice: string;
  primary_objective: string;
  objective_description?: string | null;
  instructions: string;
  knowledge_base_ids: string[];
  channels: string[];
  calendar_connection_id?: string | null;
  guardrails?: Record<string, unknown>;
  change_summary?: string;
  published_at: string;
  created_at: string;
  is_active: boolean;
}

export interface AgentGuardrails {
  handoff_keywords?: string[];
  protect_pricing?: boolean;
  versions?: AgentVersion[];
  active_version?: number;
  draft?: Partial<AgentVersion> | null;
  [key: string]: unknown;
}

export interface AgentData {
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
  guardrails: AgentGuardrails;
  status: "active" | "paused";
  created_at: string;
  updated_at: string;
}

