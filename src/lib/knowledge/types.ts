export type DocumentSourceType =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "md"
  | "txt"
  | "url"
  | "gdrive"
  | "onedrive";

export interface KnowledgeBase {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  description: string | null;
  objective: string | null;
  created_at: string;
  updated_at: string;
  documents_count?: number;
}

export interface KnowledgeDocument {
  id: string;
  workspace_id: string;
  knowledge_base_id: string;
  title: string;
  source_type: DocumentSourceType;
  file_url: string | null;
  file_size: number | null;
  content_json: Record<string, unknown> | null;
  status: "pending" | "processing" | "ready" | "failed";
  error_message: string | null;
  chunks_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  workspace_id: string;
  knowledge_base_id: string;
  document_id: string;
  content: string;
  metadata: {
    title?: string;
    source_type?: string;
    section?: string;
    page?: number;
    url?: string;
  };
  created_at: string;
}

export interface KnowledgeSearchResult {
  chunk_id: string;
  document_id: string;
  knowledge_base_id: string;
  content: string;
  metadata: Record<string, unknown>;
  rank: number;
}

