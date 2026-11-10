import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Database,
  ExternalLink,
  Layers,
  FileText,
  Clock,
} from "lucide-react";
import { deleteKnowledgeDocument, deleteKnowledgeBase } from "../actions";
import { UniversalKnowledgeUploader } from "@/components/knowledge/UniversalKnowledgeUploader";

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await requireSession();
  const db = admin();

  const { data: base } = await db
    .from("knowledge_bases")
    .select("id, name, category, description, objective, created_at")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!base) notFound();

  // Query ultrarrápida: não seleciona o campo pesado content_json na listagem
  const { data: docs } = await db
    .from("knowledge_documents")
    .select("id, title, source_type, file_size, chunks_count, status, file_url, created_at")
    .eq("knowledge_base_id", id)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const documents = docs ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <div>
        <Link
          href="/app/knowledge"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Bases de Conhecimento
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {base.category}
              </span>
              <h1 className="text-2xl font-bold text-zinc-900">{base.name}</h1>
            </div>
            {base.objective && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-medium text-zinc-900">Objetivo:</span> {base.objective}
              </p>
            )}
          </div>
          <form action={deleteKnowledgeBase.bind(null, base.id)}>
            <button className="btn-danger text-xs flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Excluir Base
            </button>
          </form>
        </div>
      </div>

      {/* Upload Universal: Múltiplos Arquivos e Múltiplos Links sem necessidade de escolher tipo */}
      <UniversalKnowledgeUploader baseId={base.id} />

      {/* Lista de Documentos Indexados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-600" />
            Documentos Indexados ({documents.length})
          </h2>
          <span className="text-xs text-zinc-400">
            Indexados em formato estruturado com busca rápida
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="card p-8 text-center space-y-2 border-dashed border-zinc-200">
            <p className="text-sm text-zinc-500 font-medium">Nenhum documento adicionado a esta base ainda.</p>
            <p className="text-xs text-zinc-400">
              Envie arquivos PDF, DOCX, planilhas ou cole links no formulário acima para compor a base.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-zinc-100 overflow-hidden shadow-sm">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold border border-brand-100 uppercase text-xs">
                    {doc.source_type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 truncate">
                        {doc.title}
                      </span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-800"
                          title="Abrir link original"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span>{Math.round((doc.file_size || 0) / 1024)} KB</span>
                      <span>•</span>
                      <span>{doc.chunks_count} trechos indexados</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                <form action={deleteKnowledgeDocument.bind(null, doc.id, base.id)}>
                  <button
                    type="submit"
                    className="text-zinc-400 hover:text-red-600 p-1.5 transition-colors"
                    title="Excluir documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
