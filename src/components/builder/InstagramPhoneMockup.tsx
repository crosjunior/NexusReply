"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Smile,
  ChevronLeft,
  Phone,
  Video,
  Info,
  Sparkles,
  ExternalLink,
  Bot,
} from "lucide-react";

export interface InstagramPreviewData {
  accountName?: string;
  accountUsername?: string;
  accountAvatar?: string;
  postImage?: string;
  postCaption?: string;
  triggerKeywords?: string[];
  publicCommentReply?: string;
  welcomeMessage?: string;
  buttonText?: string;
  followUpType?: "link" | "ai" | "email";
  followUpLink?: string;
  followUpText?: string;
  aiPromptSummary?: string;
  knowledgeBaseName?: string;
}

export function InstagramPhoneMockup({
  data,
  initialTab = "comments",
}: {
  data: InstagramPreviewData;
  initialTab?: "post" | "comments" | "dm";
}) {
  const [tab, setTab] = useState<"post" | "comments" | "dm">(initialTab);
  const [isLiked, setIsLiked] = useState(true);

  const username = data.accountUsername || "ocarlossilvajr";
  const displayName = data.accountName || "Carlos Silva Jr.";
  const avatar =
    data.accountAvatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const postImg =
    data.postImage ||
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";

  const triggerWord = data.triggerKeywords?.[0] || "QUERO";
  const publicReply =
    data.publicCommentReply ||
    "Te mandei uma mensagem no Direct! 📩 Dá uma olhada lá 😉";

  const welcomeMsg =
    data.welcomeMessage ||
    "Olá! Vi que você comentou no nosso post. Toque no botão abaixo para receber o material exclusivo 👇";

  const btnText = data.buttonText || "Me envie o link 🔗";

  return (
    <div className="flex flex-col items-center">
      {/* Seletor de abas da visualização do celular */}
      <div className="mb-3 flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-600 shadow-inner">
        <button
          type="button"
          onClick={() => setTab("post")}
          className={`rounded-full px-3 py-1 transition-all ${
            tab === "post"
              ? "bg-white text-zinc-900 shadow-sm font-semibold"
              : "hover:text-zinc-900"
          }`}
        >
          Publicação
        </button>
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={`rounded-full px-3 py-1 transition-all ${
            tab === "comments"
              ? "bg-white text-zinc-900 shadow-sm font-semibold"
              : "hover:text-zinc-900"
          }`}
        >
          Comentários
        </button>
        <button
          type="button"
          onClick={() => setTab("dm")}
          className={`rounded-full px-3 py-1 transition-all ${
            tab === "dm"
              ? "bg-white text-zinc-900 shadow-sm font-semibold"
              : "hover:text-zinc-900"
          }`}
        >
          Direct (DM)
        </button>
      </div>

      {/* Chassi do Smartphone (Estilo iPhone Pro) */}
      <div className="relative mx-auto h-[620px] w-[310px] rounded-[44px] bg-zinc-900 p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ring-1 ring-zinc-800">
        {/* Dynamic Island / Notch */}
        <div className="absolute left-1/2 top-5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black flex items-center justify-end px-2">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-900/90 ring-1 ring-zinc-700/50"></div>
        </div>

        {/* Alto-falante e botões físicos sutis nas laterais */}
        <div className="absolute -left-[2px] top-24 h-10 w-[2px] rounded-l-sm bg-zinc-700"></div>
        <div className="absolute -left-[2px] top-38 h-10 w-[2px] rounded-l-sm bg-zinc-700"></div>
        <div className="absolute -right-[2px] top-32 h-14 w-[2px] rounded-r-sm bg-zinc-700"></div>

        {/* Tela do Aplicativo (Instagram) */}
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] bg-black text-white text-[11px] select-none">
          {/* Barra de Status iOS */}
          <div className="flex h-10 w-full items-center justify-between px-6 pt-2 text-[10px] font-semibold text-zinc-300">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px]">5G</span>
              <div className="h-2.5 w-5 rounded-[3px] border border-zinc-400 p-[1px]">
                <div className="h-full w-3/4 rounded-[1.5px] bg-white"></div>
              </div>
            </div>
          </div>

          {/* CONTEÚDO DA ABA SELECIONADA */}
          {tab === "post" && (
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Header do Post */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <img
                    src={avatar}
                    alt={username}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-1 font-semibold leading-none">
                      {username}
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center">
                        ✓
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400">Áudio original</span>
                  </div>
                </div>
                <span className="text-zinc-400">•••</span>
              </div>

              {/* Imagem do Post */}
              <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
                <img
                  src={postImg}
                  alt="Post"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Ações do Post */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsLiked(!isLiked)}
                      className="text-white hover:opacity-80 transition"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          isLiked ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("comments")}
                      className="text-white hover:opacity-80 transition"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                    <Send className="h-5 w-5" />
                  </div>
                  <Bookmark className="h-5 w-5" />
                </div>
                <p className="font-semibold text-[10px] mb-1">
                  {isLiked ? "Curtido por conexaoagil e outras 1.420 pessoas" : "1.420 curtidas"}
                </p>
                <p className="text-[10px] leading-tight text-zinc-200">
                  <span className="font-semibold text-white mr-1">{username}</span>
                  {data.postCaption ||
                    "Comente a palavra abaixo para receber o fluxo automatizado diretamente no seu Direct!"}
                </p>
                <button
                  type="button"
                  onClick={() => setTab("comments")}
                  className="mt-1 text-[9px] text-zinc-400 hover:text-zinc-200"
                >
                  Ver todos os 48 comentários...
                </button>
              </div>
            </div>
          )}

          {tab === "comments" && (
            <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
              {/* Header Comentários */}
              <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setTab("post")}
                  className="text-zinc-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-[11px]">Comentários</span>
                <span className="w-4"></span>
              </div>

              {/* Lista de Comentários */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Comentário do Usuário (Palavra-Chave) */}
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                    CA
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-semibold text-white">conexaoagil</span>
                      <span className="text-[9px] text-zinc-500">Agora</span>
                    </div>
                    <p className="text-zinc-200 font-medium bg-zinc-900/80 rounded-lg p-2 border border-zinc-800">
                      {triggerWord}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] text-zinc-500">
                      <span>Responder</span>
                      <span>Enviar</span>
                    </div>

                    {/* Resposta Automática Pública da Conta */}
                    <div className="mt-2.5 pl-3 border-l-2 border-brand-500 flex gap-2 items-start">
                      <img
                        src={avatar}
                        alt={username}
                        className="h-5 w-5 rounded-full object-cover shrink-0 ring-1 ring-brand-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1 font-semibold text-white text-[10px]">
                          {username}
                          <span className="rounded bg-brand-500/20 px-1 py-0.2 text-[8px] text-brand-300 font-normal">
                            Autor
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-tight mt-0.5">
                          {publicReply}
                        </p>
                        <span className="text-[8px] text-brand-400 mt-1 inline-block font-medium">
                          ⚡ Resposta enviada no Direct
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reações rápidas de Emojis do Instagram */}
              <div className="flex items-center justify-around border-t border-zinc-900 bg-zinc-900/50 py-1.5 text-base">
                <span className="cursor-pointer hover:scale-125 transition">❤️</span>
                <span className="cursor-pointer hover:scale-125 transition">🙌</span>
                <span className="cursor-pointer hover:scale-125 transition">🔥</span>
                <span className="cursor-pointer hover:scale-125 transition">👏</span>
                <span className="cursor-pointer hover:scale-125 transition">😢</span>
                <span className="cursor-pointer hover:scale-125 transition">😍</span>
                <span className="cursor-pointer hover:scale-125 transition">😮</span>
                <span className="cursor-pointer hover:scale-125 transition">😂</span>
              </div>

              {/* Input de Comentário */}
              <div className="border-t border-zinc-900 p-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-700 shrink-0"></div>
                <div className="flex-1 rounded-full bg-zinc-900 px-3 py-1.5 text-zinc-500 text-[10px]">
                  Adicione um comentário...
                </div>
                <button
                  type="button"
                  onClick={() => setTab("dm")}
                  className="text-brand-400 font-semibold text-[10px] hover:text-brand-300"
                >
                  Ver DM →
                </button>
              </div>
            </div>
          )}

          {tab === "dm" && (
            <div className="flex flex-1 flex-col overflow-hidden bg-black">
              {/* Header DM */}
              <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-2 bg-zinc-950">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("comments")}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <img
                    src={avatar}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                  <div>
                    <div className="font-semibold text-white leading-none flex items-center gap-1">
                      {displayName}
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    </div>
                    <span className="text-[9px] text-zinc-400">{username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Phone className="h-3.5 w-3.5" />
                  <Video className="h-3.5 w-3.5" />
                  <Info className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Mensagens do Direct */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="text-center my-1">
                  <span className="text-[8px] text-zinc-500 font-medium">HOJE 9:41</span>
                </div>

                {/* Balão 1: Mensagem de Boas-Vindas da Automação */}
                <div className="flex gap-2 items-end max-w-[88%]">
                  <img
                    src={avatar}
                    alt={username}
                    className="h-5 w-5 rounded-full object-cover mb-1 shrink-0"
                  />
                  <div className="space-y-1.5">
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-800 p-2.5 text-zinc-100 text-[10.5px] leading-relaxed shadow-sm">
                      {welcomeMsg}
                    </div>

                    {/* Botão Interativo configurado */}
                    {btnText && (
                      <div className="overflow-hidden rounded-xl border border-brand-500/40 bg-zinc-900/90 shadow">
                        <button
                          type="button"
                          className="w-full py-2 px-3 text-center text-[10px] font-semibold text-brand-300 hover:bg-brand-500/10 transition flex items-center justify-center gap-1"
                        >
                          <Sparkles className="h-3 w-3 text-brand-400" />
                          {btnText}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resposta do Usuário clicando no botão */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-brand-600 px-3 py-1.5 text-white text-[10.5px] font-medium shadow-sm">
                    {btnText}
                  </div>
                </div>

                {/* Balão 2: Continuação com Link OU Agente de IA com Base de Conhecimento */}
                {data.followUpType === "ai" ? (
                  <div className="flex gap-2 items-end max-w-[88%]">
                    <img
                      src={avatar}
                      alt={username}
                      className="h-5 w-5 rounded-full object-cover mb-1 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-brand-950 to-zinc-850 p-2.5 text-zinc-100 text-[10.5px] leading-relaxed border border-brand-500/30">
                        <div className="flex items-center gap-1 text-[9px] font-semibold text-brand-300 mb-1">
                          <Bot className="h-3 w-3 text-brand-400" />
                          Agente IA ({data.knowledgeBaseName || "Base de Conhecimento"})
                        </div>
                        {data.followUpText ||
                          "Com certeza! Consultei nossa base de dados e vi que temos exatamente a solução para o seu negócio. Gostaria que eu te apresentasse os detalhes ou agendasse uma conversa?"}
                      </div>
                      <span className="text-[8px] text-zinc-500 pl-1">
                        Responde em segundos usando IA RAG
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end max-w-[88%]">
                    <img
                      src={avatar}
                      alt={username}
                      className="h-5 w-5 rounded-full object-cover mb-1 shrink-0"
                    />
                    <div className="rounded-2xl rounded-bl-sm bg-zinc-800 p-2.5 text-zinc-100 text-[10.5px] leading-relaxed shadow-sm">
                      <p>
                        {data.followUpText ||
                          "Aqui está o link que você pediu! Clique abaixo para acessar imediatamente:"}
                      </p>
                      {data.followUpLink && (
                        <a
                          href={data.followUpLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block rounded-lg bg-zinc-900 p-2 border border-zinc-700 text-brand-300 hover:text-brand-200 text-[10px] font-semibold flex items-center justify-between"
                        >
                          <span className="truncate">{data.followUpLink}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input da DM */}
              <div className="border-t border-zinc-900 p-2 flex items-center gap-2 bg-zinc-950">
                <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  📷
                </div>
                <div className="flex-1 rounded-full bg-zinc-900 px-3 py-1.5 text-zinc-500 text-[10px]">
                  Mensagem...
                </div>
                <Smile className="h-4 w-4 text-zinc-400" />
                <Send className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          )}

          {/* Barra inferior do iPhone (Home Indicator) */}
          <div className="flex h-4 w-full items-center justify-center bg-black">
            <div className="h-1 w-24 rounded-full bg-zinc-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

