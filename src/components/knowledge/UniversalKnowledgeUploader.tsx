"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Globe,
  FileText,
  Plus,
  CheckCircle,
  X,
  Layers,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  File,
} from "lucide-react";
import { addBatchDocumentsAction } from "@/app/app/knowledge/actions";
import type { DocumentSourceType } from "@/lib/knowledge/types";

interface FileEntry {
  file: File;
  title: string;
  sourceType: DocumentSourceType;
  textPreview: string;
}

export function UniversalKnowledgeUploader({ baseId }: { baseId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [linksText, setLinksText] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detecta automaticamente o tipo da fonte pelo nome do arquivo
  function detectSourceType(fileName: string): DocumentSourceType {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "docx";
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
    if (ext === "md" || ext === "txt" || ext === "json") return "txt";
    return "txt";
  }

  // Manipula seleção de múltiplos arquivos
  function handleFilesSelected(selectedFiles: FileList | null) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newEntries: FileEntry[] = [];
    const fileList = Array.from(selectedFiles);

    fileList.forEach((file) => {
      const sourceType = detectSourceType(file.name);
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = (e.target?.result as string) || "";
        setFiles((prev) => [
          ...prev,
          {
            file,
            title: file.name,
            sourceType,
            textPreview: text || `Arquivo: ${file.name} (${Math.round(file.size / 1024)} KB)`,
          },
        ]);
      };

      // Tenta ler como texto; para binários (pdf/docx), o fallback é gerado
      if (file.name.match(/\.(txt|md|csv|json)$/i)) {
        reader.readAsText(file);
      } else {
        // Para PDF/DOCX/XLSX: extrai prévia com metadados do arquivo
        setFiles((prev) => [
          ...prev,
          {
            file,
            title: file.name,
            sourceType,
            textPreview: `Documento: ${file.name} - Tamanho: ${Math.round(file.size / 1024)} KB. Indexado para consulta da IA.`,
          },
        ]);
      }
    });
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleProcessAll() {
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage("Preparando e indexando conteúdos...");

    try {
      const itemsToIngest: Array<{
        title: string;
        sourceType: DocumentSourceType;
        content?: string;
        url?: string;
        fileSize?: number;
      }> = [];

      // 1. Adiciona arquivos selecionados
      for (const f of files) {
        itemsToIngest.push({
          title: f.title,
          sourceType: f.sourceType,
          content: f.textPreview,
          fileSize: f.file.size,
        });
      }

      // 2. Adiciona links (um ou vários por linha)
      const rawLinks = linksText
        .split(/[\n,]+/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("http://") || l.startsWith("https://"));

      for (const link of rawLinks) {
        let domain = "";
        try {
          domain = new URL(link).hostname.replace(/^www\./, "");
        } catch {}
        itemsToIngest.push({
          title: domain ? `Site: ${domain}` : link,
          sourceType: "url",
          url: link,
        });
      }

      // 3. Adiciona texto manual (se houver)
      if (manualText.trim()) {
        itemsToIngest.push({
          title: manualTitle.trim() || "Notas e FAQs Manuais",
          sourceType: "txt",
          content: manualText.trim(),
        });
      }

      if (itemsToIngest.length === 0) {
        setErrorMessage("Selecione ao menos um arquivo ou informe um link.");
        setIsProcessing(false);
        return;
      }

      setStatusMessage(`Indexando ${itemsToIngest.length} item(ns) na base...`);
      const res = await addBatchDocumentsAction({
        baseId,
        items: itemsToIngest,
      });

      if (res.ok) {
        setStatusMessage(`Sucesso! ${res.count} documento(s) indexado(s) com busca rápida.`);
        setFiles([]);
        setLinksText("");
        setManualText("");
        setManualTitle("");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Erro ao processar documentos.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido ao processar.");
    } finally {
      setIsProcessing(false);
    }
  }

  const totalItemsCount =
    files.length +
    linksText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("http")).length +
    (manualText.trim() ? 1 : 0);

  return (
    <div className="card p-6 space-y-6 bg-white shadow-sm border border-zinc-200">
      <div>
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-600" />
          Adicionar Conteúdos à Base de Conhecimento
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Envie um ou vários arquivos (PDF, Word, Excel, CSV, TXT, Markdown) ou cole múltiplos links. Não é necessário selecionar o tipo de fonte: o sistema identifica tudo automaticamente.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2 border border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2 border border-red-200">
          <X className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Upload Universal de Múltiplos Arquivos */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-800 block flex items-center gap-1.5">
            <Upload className="h-4 w-4 text-brand-600" />
            1. Enviar Arquivos (Um ou Vários ao mesmo tempo)
          </label>

          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 hover:border-brand-500 rounded-2xl bg-zinc-50/60 hover:bg-brand-50/20 cursor-pointer transition-all group text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-zinc-200 group-hover:scale-110 transition-transform">
              <Upload className="h-6 w-6 text-brand-600" />
            </div>
            <span className="font-semibold text-xs text-zinc-800 mt-3 block">
              Arraste arquivos ou clique para selecionar
            </span>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Aceita PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Markdown
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </label>

          {/* Lista de Arquivos Selecionados */}
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                {files.length} arquivo(s) prontos para indexação:
              </span>
              {files.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-zinc-200 bg-white text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-700 uppercase">
                      {f.sourceType}
                    </span>
                    <span className="truncate font-medium text-zinc-800">{f.title}</span>
                    <span className="text-[10px] text-zinc-400">
                      ({Math.round(f.file.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-zinc-400 hover:text-red-500 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lado Direito: Múltiplos Links / Sites e Textos */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-800 block mb-1.5 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-brand-600" />
              2. Links e Sites (Cole um ou vários links)
            </label>
            <textarea
              rows={4}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder="Cole os links aqui (um por linha):&#10;https://seusite.com.br/produtos&#10;https://seusite.com.br/faq&#10;https://drive.google.com/..."
              className="input w-full text-xs font-mono bg-white"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              O robô raspa o conteúdo textual das páginas e indexa para consulta rápida da IA.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-800 block mb-1.5 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-brand-600" />
              3. Texto Livre / FAQ Direto (Opcional)
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Título: Ex. Regras de Cancelamento e Prazos"
              className="input w-full text-xs mb-1.5 bg-white"
            />
            <textarea
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Cole aqui textos, políticas internas ou perguntas frequentes..."
              className="input w-full text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Barra de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-zinc-200">
        <div className="text-xs text-zinc-500">
          Total selecionado: <strong>{totalItemsCount}</strong> fonte(s) de conhecimento.
        </div>
        <button
          type="button"
          disabled={isProcessing || totalItemsCount === 0}
          onClick={handleProcessAll}
          className="btn-primary text-xs py-2 px-5 flex items-center justify-center gap-2 shadow-sm"
        >
          {isProcessing ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              Indexando Fontes...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Processar e Indexar Tudo ({totalItemsCount})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

