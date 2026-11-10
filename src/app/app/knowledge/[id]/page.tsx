import { requireSession } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Globe, Trash2, Search, Code, CheckCircle, Database } from "lucide-react";
import { addDocumentToKnowledgeBase, deleteKnowledgeDocument, deleteKnowledgeBase } from "../actions";

export default async function KnowledgeBaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspaceId } = await requireSession();

  const { data: base } = await supabase
    .from("knowledge_bases")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!base) notFound();

  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("id, title, source_type, file_size, chunks_count, status, content_json, created_at")
    .eq("knowledge_base_id", id)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const documents = docs ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <div>
        <Link href="/app/knowledge" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 mb-2">
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

      {/* Adicionar Novo Documento / Fonte de Conhecimento */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" />
          Adicionar Documento ou Link à Base
        </h2>
        <form action={addDocumentToKnowledgeBase} className="space-y-4">
          <input type="hidden" name="baseId" value={base.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Título do Documento *</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Tabela de Preços e Prazos 2026"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="label">Tipo de Fonte</label>
              <select name="sourceType" className="input w-full text-sm bg-white">
                <option value="txt">Texto / Manual / Artigo (.txt, .md)</option>
                <option value="pdf">Documento PDF (.pdf)</option>
                <option value="docx">Arquivo Word (.docx)</option>
                <option value="xlsx">Planilha Excel (.xlsx, .csv)</option>
                <option value="url">Página Web / Site (Link URL)</option>
                <option value="gdrive">Google Drive (Link compartilhado)</option>
                <option value="onedrive">OneDrive (Link compartilhado)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">URL do Site ou Link (opcional se colar texto)</label>
            <input
              type="url"
              name="url"
              placeholder="https://suaempresa.com.br/sobre-ou-faq"
              className="input w-full text-sm"
            />
          </div>

          <div>
            <label className="label">Conteúdo do Documento ou Texto Completo</label>
            <textarea
              name="content"
              rows={6}
              placeholder="Cole aqui as informações, regras, respostas frequentes, tabelas ou copie do PDF/Word/Excel..."
              className="input w-full text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              O conteúdo será estruturado automaticamente em formato JSON no banco e indexado em chunks com busca rápida.
            </p>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary text-xs">
              + Processar e Indexar Documento
            </button>
          </div>
        </form>
      </div>

      {/* Listagem dos Documentos da Base */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-600" />
            Documentos Indexados ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="card p-8 text-center text-sm text-zinc-500">
            Nenhum documento adicionado a esta base ainda. Adicione o primeiro no formulário acima.
          </div>
        ) : (
          <div className="card divide-y divide-zinc-100">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                      {doc.source_type}
                    </span>
                    <h4 className="font-medium text-sm text-zinc-900 truncate">{doc.title}</h4>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle className="h-3 w-3" /> Indexado
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 flex items-center gap-3">
                    <span>{doc.chunks_count} chunks gerados</span>
                    <span>•</span>
                    <span>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "0 KB"}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <form action={deleteKnowledgeDocument.bind(null, doc.id, base.id)}>
                    <button className="btn-ghost text-red-500 hover:text-red-700 text-xs p-2" title="Excluir documento">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

