import type { EngineState, EntryContext, FlowGraph } from "../engine/types";

export interface IgAccountRow {
  id: string;
  workspace_id: string;
  ig_user_id: string;
  username: string | null;
  access_token_enc: string;
  token_expires_at: string | null;
  status: string;
}

export interface WaAccountRow {
  id: string;
  workspace_id: string;
  phone_number_id: string;
  waba_id: string | null;
  display_phone_number: string | null;
  name: string | null;
  access_token_enc: string;
  status: string;
}

export interface ContactRow {
  id: string;
  workspace_id: string;
  channel?: "instagram" | "whatsapp";
  ig_account_id?: string | null;
  wa_account_id?: string | null;
  igsid?: string | null;
  phone_number?: string | null;
  username: string | null;
  name: string | null;
  tags: string[];
  fields: Record<string, unknown>;
  window_expires_at: string | null;
  last_interaction_at: string | null;
}

export interface ConversationRow {
  id: string;
  workspace_id: string;
  contact_id: string;
  channel?: "instagram" | "whatsapp";
  ig_account_id?: string | null;
  wa_account_id?: string | null;
  status: "bot" | "human" | "closed";
}

export interface FlowRow {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  published_graph: FlowGraph | null;
}

export interface SessionRow {
  id: string;
  workspace_id: string;
  flow_id: string;
  contact_id: string;
  state: EngineState;
  status: string;
  entry: EntryContext;
  updated_at: string;
}

export interface RunContext {
  channel: "instagram" | "whatsapp";
  account: IgAccountRow | WaAccountRow;
  token: string;
  contact: ContactRow;
  conversation: ConversationRow;
}
