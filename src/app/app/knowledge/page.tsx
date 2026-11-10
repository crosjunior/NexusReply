import { requireSession } from "@/lib/supabase/server";
import { BookOpen, FolderPlus, FileText, ArrowRight, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { createKnowledgeBase } from "./actions";

export default async function KnowledgeBasesPage() {
  const { supabase, workspaceId } = await requireSession();

  const { data: bases } = await supabase
    .from("knowledge_bases")
    .select("id, name, category, description, objective, created_at, knowledge_documents(count)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const items = (bases ?? []).map((b) => ({
    ...b,
    docsCount: (b.knowledge_documents as unknown as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));

  // Agrupa por categoria
  const categoriesMap = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category || "Geral";
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat)!.push(item);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-600" />
            Bases de Conhecimento
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Adicione documentos, manuais, planilhas e sites para compor o cérebro dos seus agentes de IA.
          </p>
        </div>
      </div>

      {/* Formulário Rápido de Criação */}
      <div className="card p-5 bg-gradient-to-br from-white to-zinc-50/50">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5 mb-3">
          <FolderPlus className="h-4 w-4 text-brand-600" />
          Criar Nova Base de Conhecimento
        </h2>
        <form action={createKnowledgeBase} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Nome da Base *</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ex: FAQ de Vendas & Planos"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input
              type="text"
              name="category"
              placeholder="Ex: Comercial, Suporte, Produto"
              defaultValue="Comercial"
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="label">Objetivo da Base</label>
            <input
              type="text"
              name="objective"
              placeholder="Ex: Responder dúvidas de preços e planos"
              className="input w-full text-sm"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full text-sm py-2">
              + Criar Base
            </button>
          </div>
        </form>
      </div>

      {/* Listagem das Bases */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-base font-medium text-zinc-900">Nenhuma base criada ainda</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Crie sua primeira base de conhecimento acima e faça upload de arquivos para treinar seu agente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(categoriesMap.entries()).map(([category, list]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Categoria: {category} ({list.length})
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((b) => (
                  <Link
                    key={b.id}
                    href={`/app/knowledge/${b.id}`}
                    className="card p-5 hover:border-brand-500 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                          {b.category}
                        </span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {b.docsCount} {b.docsCount === 1 ? "doc" : "docs"}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                        {b.name}
                      </h4>
                      {b.objective && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          <span className="font-medium text-zinc-700">Objetivo:</span> {b.objective}
                        </p>
                      )}
                      {b.description && (
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{b.description}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-medium text-brand-600">
                      <span>Gerenciar documentos</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

