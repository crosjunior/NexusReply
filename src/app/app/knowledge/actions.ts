"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { parseAndChunkContent } from "@/lib/knowledge/parser";
import type { DocumentSourceType } from "@/lib/knowledge/types";

export async function createKnowledgeBase(formData: FormData): Promise<void> {
  const { workspaceId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "Geral").trim() || "Geral";
  const description = String(formData.get("description") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;

  if (!name) return;

  const db = admin();
  const { data, error } = await db
    .from("knowledge_bases")
    .insert({
      workspace_id: workspaceId,
      name,
      category,
      description,
      objective,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar base:", error.message);
    return;
  }
  revalidatePath("/app/knowledge");
  if (data?.id) {
    redirect(`/app/knowledge/${data.id}`);
  }
}

export async function addDocumentToKnowledgeBase(formData: FormData): Promise<void> {
  const { workspaceId } = await requireSession();
  const baseId = String(formData.get("baseId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const sourceType = (String(formData.get("sourceType") ?? "txt").trim()) as DocumentSourceType;
  const content = String(formData.get("content") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;

  if (!baseId || !title) return;

  let textToParse = content;

  // Se for URL de site ou documento web, tenta buscar o conteúdo HTML / texto
  if (sourceType === "url" && url) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "NexusReply-Crawler/1.0" }, signal: AbortSignal.timeout(8000) });
      const html = await res.text();
      // Remove tags HTML simples e scripts
      textToParse = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch (err) {
      console.error("Falha ao acessar URL:", err);
      return;
    }
  }

  if (!textToParse) return;

  // Converte em JSON estruturado e fragmenta em chunks
  const parsed = parseAndChunkContent(title, sourceType, textToParse, { url });
  const db = admin();

  // 1. Grava o documento com JSON estruturado
  const { data: doc, error: docErr } = await db
    .from("knowledge_documents")
    .insert({
      workspace_id: workspaceId,
      knowledge_base_id: baseId,
      title,
      source_type: sourceType,
      file_url: url,
      file_size: textToParse.length,
      content_json: parsed.contentJson,
      chunks_count: parsed.chunks.length,
      status: "ready",
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    console.error("Erro ao gravar documento:", docErr?.message);
    return;
  }

  // 2. Grava os chunks para busca
  const chunkRows = parsed.chunks.map((c) => ({
    workspace_id: workspaceId,
    knowledge_base_id: baseId,
    document_id: doc.id,
    content: c.content,
    metadata: c.metadata,
  }));

  if (chunkRows.length > 0) {
    await db.from("knowledge_chunks").insert(chunkRows);
  }

  revalidatePath(`/app/knowledge/${baseId}`);
  revalidatePath("/app/knowledge");
}

export async function addBatchDocumentsAction(data: {
  baseId: string;
  items: Array<{
    title: string;
    sourceType: DocumentSourceType;
    content?: string;
    url?: string;
    fileSize?: number;
  }>;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const { workspaceId } = await requireSession();
  const db = admin();
  let successCount = 0;

  for (const item of data.items) {
    try {
      let textToParse = (item.content ?? "").trim();

      // Se for URL, raspa o conteúdo da página
      if (item.sourceType === "url" && item.url) {
        try {
          const res = await fetch(item.url, {
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
        } catch (err) {
          console.error("Falha ao raspar URL:", item.url, err);
          if (!textToParse) {
            textToParse = `Link: ${item.url}\n(Conteúdo não pôde ser raspado automaticamente mas o link foi indexado como referência)`;
          }
        }
      }

      if (!textToParse) continue;

      const parsed = parseAndChunkContent(
        item.title,
        item.sourceType,
        textToParse,
        item.url ? { url: item.url } : {}
      );

      const { data: doc, error: docErr } = await db
        .from("knowledge_documents")
        .insert({
          workspace_id: workspaceId,
          knowledge_base_id: data.baseId,
          title: item.title,
          source_type: item.sourceType,
          file_url: item.url ?? null,
          file_size: item.fileSize || textToParse.length,
          content_json: parsed.contentJson,
          chunks_count: parsed.chunks.length,
          status: "ready",
        })
        .select("id")
        .single();

      if (doc && parsed.chunks.length > 0) {
        await db.from("knowledge_chunks").insert(
          parsed.chunks.map((c) => ({
            workspace_id: workspaceId,
            knowledge_base_id: data.baseId,
            document_id: doc.id,
            content: c.content,
            metadata: c.metadata,
          }))
        );
        successCount++;
      }
    } catch (err) {
      console.error("Erro ao indexar item:", item.title, err);
    }
  }

  revalidatePath(`/app/knowledge/${data.baseId}`);
  revalidatePath("/app/knowledge");
  return { ok: true, count: successCount };
}

export async function deleteKnowledgeBase(id: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db.from("knowledge_bases").delete().eq("id", id).eq("workspace_id", workspaceId);
  revalidatePath("/app/knowledge");
}

export async function deleteKnowledgeDocument(docId: string, baseId: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db.from("knowledge_documents").delete().eq("id", docId).eq("workspace_id", workspaceId);
  revalidatePath(`/app/knowledge/${baseId}`);
}
