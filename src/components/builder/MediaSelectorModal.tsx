"use client";

import { useState, useEffect } from "react";
import { Film, Image as ImageIcon, Sparkles, X, Check, Calendar, Search } from "lucide-react";
import type { IgMediaItem } from "@/lib/instagram/api";
import type { TargetMedia } from "@/lib/engine/types";
import { getInstagramAccountMediaAction } from "@/app/app/actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: TargetMedia | null) => void;
  selectedMediaId?: string;
}

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedMediaId,
}: Props) {
  const [tab, setTab] = useState<"all" | "posts" | "reels" | "stories">("all");
  const [items, setItems] = useState<IgMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getInstagramAccountMediaAction()
      .then((res) => {
        if (res.ok && res.media) {
          setItems(res.media);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    // Filtro por aba
    const pType = (item.media_product_type || "").toUpperCase();
    const mType = (item.media_type || "").toUpperCase();
    const isReel = pType === "REELS" || (mType === "VIDEO" && pType !== "FEED" && pType !== "STORY");
    const isStory = pType === "STORY";
    const isPost = !isReel && !isStory;

    if (tab === "posts" && !isPost) return false;
    if (tab === "reels" && !isReel) return false;
    if (tab === "stories" && !isStory) return false;

    // Filtro por busca
    if (search.trim()) {
      const q = search.toLowerCase();
      const cap = (item.caption || "").toLowerCase();
      return cap.includes(q) || item.id.includes(q);
    }
    return true;
  });

  const getFormatBadge = (item: IgMediaItem) => {
    const pType = (item.media_product_type || "").toUpperCase();
    const mType = (item.media_type || "").toUpperCase();
    if (pType === "STORY") {
      return (
        <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
          STORY
        </span>
      );
    }
    if (pType === "REELS" || (mType === "VIDEO" && pType !== "FEED")) {
      return (
        <span className="rounded bg-rose-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-0.5">
          <Film className="h-2.5 w-2.5" /> REELS
        </span>
      );
    }
    return (
      <span className="rounded bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-0.5">
        <ImageIcon className="h-2.5 w-2.5" /> POST
      </span>
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleChoose = (item: IgMediaItem) => {
    const pType = (item.media_product_type || "").toUpperCase();
    const mType = (item.media_type || "").toUpperCase();
    const isReel = pType === "REELS" || (mType === "VIDEO" && pType !== "FEED" && pType !== "STORY");
    const isStory = pType === "STORY";

    onSelect({
      id: item.id,
      media_type: isStory ? "STORY" : isReel ? "REELS" : "POST",
      media_product_type: item.media_product_type,
      thumbnail_url: item.thumbnail_url || item.media_url,
      media_url: item.media_url,
      caption: item.caption,
      timestamp: item.timestamp,
      permalink: item.permalink,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 sm:px-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Seletor Visual de Publicação (Estilo ManyChat)
            </h3>
            <p className="text-xs text-zinc-500">
              Vincule este fluxo a uma postagem, reels ou story específico da conta @ocarlossilvajr.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 text-zinc-400 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Filtros & Busca */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 p-4 sm:px-6 bg-zinc-50/50">
          {/* Abas Rápidas */}
          <div className="flex rounded-lg bg-zinc-200/70 p-1 text-xs">
            <button
              onClick={() => setTab("all")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                tab === "all" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setTab("posts")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                tab === "posts" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setTab("reels")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                tab === "reels" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Reels
            </button>
            <button
              onClick={() => setTab("stories")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                tab === "stories" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Stories
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar legenda..."
              className="input pl-8 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {/* Opção para "Qualquer Publicação" */}
        <div className="px-6 py-2 border-b border-zinc-100 bg-purple-50/30 flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            Deseja que a regra funcione em <strong>qualquer postagem ou story</strong>?
          </span>
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="btn-secondary text-xs py-1 px-3 border-purple-200 text-purple-700 hover:bg-purple-100"
          >
            Definir &quot;Qualquer Publicação&quot;
          </button>
        </div>

        {/* Grade de Publicações com Miniatura */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-xs text-zinc-500">Buscando publicações no Instagram @ocarlossilvajr...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              Nenhuma publicação encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((item) => {
                const isSelected = selectedMediaId === item.id;
                const thumb = item.thumbnail_url || item.media_url;
                const captionSnippet = (item.caption || "Sem legenda").replace(/\n/g, " ").slice(0, 30);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleChoose(item)}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/20 ring-2 ring-purple-600/30"
                        : "border-zinc-200 bg-white hover:border-purple-300"
                    }`}
                  >
                    {/* Capa / Miniatura com Badge de Formato */}
                    <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={captionSnippet}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}

                      {/* Etiqueta de Formato (POST, REELS, STORY) */}
                      <div className="absolute left-2 top-2 z-10">{getFormatBadge(item)}</div>

                      {/* Checkmark se Selecionado */}
                      {isSelected && (
                        <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Detalhes: Legenda (primeiros 30 caracteres) e Data/Hora */}
                    <div className="p-2.5 flex flex-col justify-between flex-1 space-y-1.5">
                      <p className="text-xs font-medium text-zinc-800 line-clamp-2 leading-snug" title={item.caption}>
                        {captionSnippet}
                        {(item.caption || "").length > 30 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-zinc-100 p-4 px-6 flex items-center justify-between bg-zinc-50/50">
          <span className="text-xs text-zinc-500">
            Total: <strong>{filtered.length}</strong> publicações encontradas
          </span>
          <button onClick={onClose} className="btn-secondary text-xs">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

