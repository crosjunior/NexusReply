import { admin } from "../supabase/admin";
import type { KnowledgeSearchResult } from "./types";

/**
 * Realiza busca hbrida de alta velocidade nas bases de conhecimento.
 */
export async function searchKnowledge(
  workspaceId: string,
  query: string,
  baseIds?: string[],
  limit = 5
): Promise<KnowledgeSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const db = admin();

  try {
    // 1. Tenta a funo RPC com tsvector
    const { data, error } = await db.rpc("search_knowledge", {
      p_workspace_id: workspaceId,
      p_query: clean,
      p_base_ids: baseIds && baseIds.length > 0 ? baseIds : null,
      p_limit: limit,
    });

    if (!error && data && data.length > 0) {
      return data as KnowledgeSearchResult[];
    }
  } catch (err) {
    console.warn("[searchKnowledge] RPC search_knowledge falhou, usando fallback ilike:", err);
  }

  // 2. Fallback resiliente usando ilike no Postgres
  let q = db
    .from("knowledge_chunks")
    .select("id, document_id, knowledge_base_id, content, metadata")
    .eq("workspace_id", workspaceId)
    .ilike("content", `%${clean}%`)
    .limit(limit);

  if (baseIds && baseIds.length > 0) {
    q = q.in("knowledge_base_id", baseIds);
  }

  const { data: fallback } = await q;

  return (fallback ?? []).map((row) => ({
    chunk_id: row.id,
    document_id: row.document_id,
    knowledge_base_id: row.knowledge_base_id,
    content: row.content,
    metadata: row.metadata as Record<string, unknown>,
    rank: 1,
  }));
}

