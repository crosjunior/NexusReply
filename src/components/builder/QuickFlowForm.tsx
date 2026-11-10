"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Bot,
  ExternalLink,
  Save,
  Rocket,
  Plus,
  X,
  FileText,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Send,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { InstagramPhoneMockup } from "./InstagramPhoneMockup";
import type { FlowGraph, FlowNode, NodeType } from "@/lib/engine/types";
import { uid } from "@/lib/flow-templates";

export interface KnowledgeBaseOption {
  id: string;
  name: string;
  category?: string;
  objective?: string;
}

export interface IgAccountInfo {
  id?: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
}

interface QuickFlowFormProps {
  flow: { id: string; name: string; status: string; graph: FlowGraph };
  knowledgeBases?: KnowledgeBaseOption[];
  igAccount?: IgAccountInfo | null;
  onSaveGraph: (graph: FlowGraph, newName?: string) => Promise<void>;
  onPublish: () => Promise<void>;
  onSwitchToVisual: () => void;
  isSaving: boolean;
}

export function QuickFlowForm({
  flow,
  knowledgeBases = [],
  igAccount,
  onSaveGraph,
  onPublish,
  onSwitchToVisual,
  isSaving,
}: QuickFlowFormProps) {
  // Extrai configurações iniciais a partir do graph do fluxo
  const startNode = flow.graph.nodes.find((n) => n.type === "start");
  const startTriggers = (startNode?.data as any)?.triggers || [];
  const commentTrigger =
    startTriggers.find((t: any) => t.type === "comment") || startTriggers[0];

  const firstMsgNode = flow.graph.nodes.find((n) => n.type === "message");
  const firstMsgData = (firstMsgNode?.data as any) || {};

  const aiNode = flow.graph.nodes.find((n) => n.type === "ai");
  const aiData = (aiNode?.data as any) || {};

  const inputNode = flow.graph.nodes.find((n) => n.type === "input");

  // Estados do Formulário
  const [flowName, setFlowName] = useState(flow.name || "Novo Fluxo de Direct");

  // Seção 1: Gatilho
  const [targetType, setTargetType] = useState<"specific" | "any">(
    commentTrigger?.mediaId ? "specific" : "any"
  );
  const [mediaId, setMediaId] = useState(commentTrigger?.mediaId || "");
  const [mediaUrl, setMediaUrl] = useState(
    commentTrigger?.mediaUrl ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
  );
  const [mediaCaption, setMediaCaption] = useState(
    commentTrigger?.mediaCaption || "Post do Instagram"
  );

  // Seção 2: Palavras-chave
  const [keywordType, setKeywordType] = useState<"keywords" | "any">(
    commentTrigger?.keywords && commentTrigger.keywords.length > 0 ? "keywords" : "any"
  );
  const [keywords, setKeywords] = useState<string[]>(
    commentTrigger?.keywords || ["QUERO", "PREÇO", "LINK", "MALL"]
  );
  const [newKeywordInput, setNewKeywordInput] = useState("");

  const [hasPublicReply, setHasPublicReply] = useState(
    Boolean(commentTrigger?.publicReplyComment)
  );
  const [publicReplyText, setPublicReplyText] = useState(
    commentTrigger?.publicReplyComment ||
      "Te respondi no direct! 📩 Dá uma olhadinha lá 😉"
  );

  // Seção 3: Boas-Vindas
  const [welcomeText, setWelcomeText] = useState(
    firstMsgData.text ||
      "Oi {{first_name}}! Vi que você comentou no nosso post. Toque no botão abaixo para receber o material exclusivo 👇"
  );
  const [buttonText, setButtonText] = useState(
    firstMsgData.buttons?.[0]?.title || "Me envie o link 🔗"
  );
  const [askEmail, setAskEmail] = useState(Boolean(inputNode));

  // Seção 4: Ação de Continuação (IA vs Link Direto)
  const [followUpMode, setFollowUpMode] = useState<"ai" | "link">(
    aiNode ? "ai" : "link"
  );
  const [selectedKbId, setSelectedKbId] = useState<string>(
    aiData.knowledgeBaseId || knowledgeBases[0]?.id || ""
  );
  const [aiPrompt, setAiPrompt] = useState<string>(
    aiData.systemPrompt ||
      "Você é o assistente virtual da nossa empresa. Seja simpático, objetivo e profissional. Responda às dúvidas dos clientes com base exclusivamente nos nossos documentos cadastrados. Quando o cliente quiser avançar, convide-o a falar com um especialista humano."
  );
  const [aiTurns, setAiTurns] = useState<number>(aiData.maxTurns || 5);

  const [linkUrl, setLinkUrl] = useState(
    firstMsgData.buttons?.[0]?.url || "https://seusite.com.br/acesso"
  );
  const [linkMessage, setLinkMessage] = useState(
    "Aqui está o link oficial que você pediu! Aproveite todo o conteúdo:"
  );

  const [isPublishing, startPublishTransition] = useTransition();
  const [successToast, setSuccessToast] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);

  // Adiciona palavra-chave
  function addKeyword() {
    const trimmed = newKeywordInput.trim().toUpperCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeywordInput("");
    }
  }

  function removeKeyword(idx: number) {
    setKeywords(keywords.filter((_, i) => i !== idx));
  }

  // Gera o FlowGraph correspondente aos campos preenchidos
  function buildGraphFromForm(): FlowGraph {
    const nodes: FlowNode[] = [];
    const edges: any[] = [];

    // Nó 1: Start
    const startId = startNode?.id || "start-1";
    nodes.push({
      id: startId,
      type: "start",
      position: { x: 100, y: 200 },
      data: {
        triggers: [
          {
            id: uid(),
            type: "comment",
            channel: "instagram",
            filterMode: keywordType === "keywords" ? "keywords" : "any",
            keywords: keywordType === "keywords" ? keywords : undefined,
            mediaId: targetType === "specific" ? mediaId || undefined : undefined,
            mediaUrl: targetType === "specific" ? mediaUrl : undefined,
            mediaCaption: targetType === "specific" ? mediaCaption : undefined,
            publicReplyComment: hasPublicReply ? publicReplyText : undefined,
          },
        ],
      } as any,
    });

    // Nó 2: Mensagem de Boas-Vindas
    const msgId = "msg-welcome";
    const btnId = uid();
    nodes.push({
      id: msgId,
      type: "message",
      position: { x: 450, y: 200 },
      data: {
        text: welcomeText,
        buttons: [{ id: btnId, title: buttonText, type: "postback" }],
        quickReplies: [],
      } as any,
    });
    edges.push({ id: uid(), source: startId, sourceHandle: "next", target: msgId });

    let lastNodeId = msgId;
    let lastHandle = btnId;

    // Se marcou pedir e-mail
    if (askEmail) {
      const emailNodeId = "input-email";
      nodes.push({
        id: emailNodeId,
        type: "input",
        position: { x: 800, y: 200 },
        data: {
          question: "Qual é o seu melhor e-mail para enviarmos?",
          field: "email",
          validation: "email",
          retryMessage: "Ops, por favor envie um e-mail válido (ex: seu@email.com).",
        } as any,
      });
      edges.push({ id: uid(), source: lastNodeId, sourceHandle: lastHandle, target: emailNodeId });
      lastNodeId = emailNodeId;
      lastHandle = "next";
    }

    // Seção de continuação: IA ou Link Direto
    if (followUpMode === "ai") {
      const aiNodeId = "ai-reply";
      nodes.push({
        id: aiNodeId,
        type: "ai",
        position: { x: askEmail ? 1150 : 800, y: 200 },
        data: {
          systemPrompt: aiPrompt,
          conversational: true,
          maxTurns: aiTurns,
          knowledgeBaseId: selectedKbId || undefined,
        } as any,
      });
      edges.push({ id: uid(), source: lastNodeId, sourceHandle: lastHandle, target: aiNodeId });
    } else {
      const finalMsgId = "msg-link";
      nodes.push({
        id: finalMsgId,
        type: "message",
        position: { x: askEmail ? 1150 : 800, y: 200 },
        data: {
          text: `${linkMessage}\n\n${linkUrl}`,
          buttons: [{ id: uid(), title: "Acessar Link Oficial", type: "url", url: linkUrl }],
          quickReplies: [],
        } as any,
      });
      edges.push({ id: uid(), source: lastNodeId, sourceHandle: lastHandle, target: finalMsgId });
    }

    return { nodes, edges };
  }

  // Ação de Salvar
  async function handleSave() {
    const graph = buildGraphFromForm();
    await onSaveGraph(graph, flowName);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  }

  // Ação de Publicar
  function handlePublish() {
    startPublishTransition(async () => {
      const graph = buildGraphFromForm();
      await onSaveGraph(graph, flowName);
      await onPublish();
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    });
  }

  const selectedKb = knowledgeBases.find((k) => k.id === selectedKbId);

  return (
    <div className="flex h-full flex-col bg-zinc-50 overflow-hidden">
      {/* Barra de Ações do Topo */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="rounded-lg border border-transparent px-2 py-1 text-lg font-bold text-zinc-900 hover:border-zinc-300 focus:border-brand-500 focus:outline-none transition"
            placeholder="Nome do Fluxo"
          />
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              flow.status === "published"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {flow.status === "published" ? "● Ativo" : "○ Rascunho"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Modo */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium text-zinc-600">
            <button
              type="button"
              className="rounded-md bg-white px-3 py-1.5 font-semibold text-brand-700 shadow-sm"
            >
              📋 Modo Formulário Rápido
            </button>
            <button
              type="button"
              onClick={onSwitchToVisual}
              className="rounded-md px-3 py-1.5 hover:text-zinc-900 transition flex items-center gap-1"
            >
              <Sliders className="h-3.5 w-3.5" />
              Modo Visual Avançado
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Salvando..." : "Salvar Rascunho"}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 transition"
          >
            <Rocket className="h-3.5 w-3.5" />
            {isPublishing ? "Ativando..." : "Ativar Fluxo"}
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-medium animate-in fade-in slide-in-from-top-1">
          ✓ Fluxo e configurações salvas com sucesso!
        </div>
      )}

      {/* Conteúdo Principal Dividido: Formulário à Esquerda (2 colunas) e Smartphone à Direita */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lado Esquerdo: Formulário Rápido com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-3xl">
          {/* SEÇÃO 1: Quando alguém faz um comentário */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                1
              </span>
              <h2 className="text-base font-bold text-zinc-900">
                Quando alguém faz um comentário
              </h2>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === "specific"}
                  onChange={() => setTargetType("specific")}
                  className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-zinc-800">
                    Uma publicação ou Reels específico
                  </span>
                  <p className="text-xs text-zinc-500">
                    O fluxo responderá apenas quem comentar neste post selecionado.
                  </p>

                  {targetType === "specific" && (
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 flex items-center gap-3">
                      <img
                        src={mediaUrl}
                        alt="Post selecionado"
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-zinc-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                            Post Selecionado
                          </span>
                          {mediaId && (
                            <a
                              href={`https://www.instagram.com/p/${mediaId}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-600 hover:underline flex items-center gap-0.5 font-medium"
                            >
                              Abrir no Instagram <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                          placeholder="Título ou descrição do post"
                          className="mt-1 w-full text-xs font-medium text-zinc-800 bg-transparent border-0 p-0 focus:ring-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === "any"}
                  onChange={() => setTargetType("any")}
                  className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-semibold text-zinc-800">
                    Qualquer publicação ou Reel
                  </span>
                  <p className="text-xs text-zinc-500">
                    Responderá comentários com a palavra-chave em qualquer post do perfil.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SEÇÃO 2: E esse comentário possui */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                2
              </span>
              <h2 className="text-base font-bold text-zinc-900">
                E esse comentário possui
              </h2>
            </div>

            <div className="space-y-4 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="keywordType"
                  checked={keywordType === "keywords"}
                  onChange={() => setKeywordType("keywords")}
                  className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-zinc-800">
                    Uma palavra ou expressão específica
                  </span>
                  <p className="text-xs text-zinc-500 mb-2">
                    Digite as palavras que ativam este fluxo (ex: QUERO, PREÇO, LINK, MALL).
                  </p>

                  {keywordType === "keywords" && (
                    <div className="space-y-2">
                      {/* Lista de Tags de Palavras-Chave */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm"
                          >
                            {kw}
                            <button
                              type="button"
                              onClick={() => removeKeyword(i)}
                              className="text-brand-400 hover:text-brand-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Input para adicionar nova palavra-chave */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newKeywordInput}
                          onChange={(e) => setNewKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addKeyword();
                            }
                          }}
                          placeholder="Digite uma palavra e aperte Enter..."
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addKeyword}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition"
                        >
                          + Adicionar
                        </button>
                      </div>

                      {/* Sugestões rápidas */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <span>Sugestões rápidas:</span>
                        {["QUERO", "PREÇO", "LINK", "MALL", "INFO"].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              if (!keywords.includes(sug)) setKeywords([...keywords, sug]);
                            }}
                            className="text-brand-600 hover:underline font-medium"
                          >
                            +{sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="keywordType"
                  checked={keywordType === "any"}
                  onChange={() => setKeywordType("any")}
                  className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-semibold text-zinc-800">
                    Qualquer palavra
                  </span>
                  <p className="text-xs text-zinc-500">
                    Dispara para qualquer comentário feito no post.
                  </p>
                </div>
              </label>

              {/* Resposta pública no comentário */}
              <div className="border-t border-zinc-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-800">
                      Interagir com os comentários feitos na publicação
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      Responde publicamente o comentário avisando que enviou no Direct.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasPublicReply}
                    onChange={(e) => setHasPublicReply(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </div>

                {hasPublicReply && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={publicReplyText}
                      onChange={(e) => setPublicReplyText(e.target.value)}
                      placeholder="Ex: Te mandei uma mensagem no Direct! 📩"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Eles receberão (Mensagem no Direct) */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                3
              </span>
              <h2 className="text-base font-bold text-zinc-900">
                Eles receberão no Direct
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Mensagem de Boas-Vindas no Direct
                </label>
                <textarea
                  rows={3}
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 p-3 text-xs leading-relaxed text-zinc-800 focus:border-brand-500 focus:outline-none"
                  placeholder="Olá {{first_name}}! ..."
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Variáveis: {"{{first_name}}"}, {"{{username}}"}</span>
                  <button
                    type="button"
                    onClick={() => setWelcomeText((prev: string) => prev + " {{first_name}}")}
                    className="text-brand-600 hover:underline"
                  >
                    + Inserir Nome
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Texto do Botão de Ação (CTA)
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                  placeholder="Ex: Me envie o link 🔗"
                />
              </div>

              <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-800">
                    Solicitar e-mail antes de enviar o conteúdo
                  </span>
                  <p className="text-[11px] text-zinc-500">
                    Pergunta o e-mail do seguidor e salva como lead qualificado.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={askEmail}
                  onChange={(e) => setAskEmail(e.target.checked)}
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: E então, eles vão receber (IA & Base de Conhecimento vs Link) */}
          <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-white to-brand-50/20 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  4
                </span>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  E então, o que o lead recebe a seguir?
                </h2>
              </div>
            </div>

            {/* Alternador de Modo de Continuação */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFollowUpMode("ai")}
                className={`rounded-xl border p-4 text-left transition ${
                  followUpMode === "ai"
                    ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-brand-800">
                  <Bot className="h-4 w-4 text-brand-600" />
                  Atendente com Agente de IA (RAG)
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  A IA assume o Direct e conversa com o lead tirando dúvidas com a sua Base de Conhecimento.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFollowUpMode("link")}
                className={`rounded-xl border p-4 text-left transition ${
                  followUpMode === "link"
                    ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-zinc-800">
                  <ExternalLink className="h-4 w-4 text-zinc-600" />
                  Entrega de Link Direto
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Envia uma mensagem final com o link da página de vendas, WhatsApp ou material.
                </p>
              </button>
            </div>

            {/* Configurações do Agente de IA com Base de Conhecimento */}
            {followUpMode === "ai" ? (
              <div className="space-y-4 rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-brand-600" />
                      Selecione a Base de Conhecimento para o Agente:
                    </label>
                    <a
                      href="/app/knowledge"
                      target="_blank"
                      className="text-[11px] text-brand-600 hover:underline font-medium"
                    >
                      + Gerenciar Bases de Conhecimento
                    </a>
                  </div>

                  {knowledgeBases.length > 0 ? (
                    <select
                      value={selectedKbId}
                      onChange={(e) => setSelectedKbId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800 focus:border-brand-500 focus:outline-none"
                    >
                      {knowledgeBases.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name} {kb.category ? `(${kb.category})` : ""} - {kb.objective || "Geral"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-500">
                      Nenhuma base de conhecimento cadastrada ainda.{" "}
                      <a
                        href="/app/knowledge"
                        target="_blank"
                        className="font-semibold text-brand-600 underline"
                      >
                        Cadastre uma base agora
                      </a>{" "}
                      com seus PDFs, sites e manuais.
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                      <Bot className="h-3.5 w-3.5 text-brand-600" />
                      Instruções e Persona do Agente de IA:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPromptGuide(!showPromptGuide)}
                      className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="h-3 w-3" />
                      Melhores Práticas & Estrutura
                    </button>
                  </div>

                  {/* Modelos Prontos de Instruções */}
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAiPrompt(
                          `Você é o consultor de vendas oficial da nossa empresa. Seu objetivo é tirar todas as dúvidas do lead sobre nossos produtos, preços e prazos usando nossa Base de Conhecimento, e incentivá-lo a fechar a compra ou agendar uma demonstração.`
                        )
                      }
                      className="rounded bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
                    >
                      Template: Vendas & FAQ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiPrompt(
                          `Você é o atendente de qualificação. Faça perguntas estratégicas para entender o momento do cliente, orçamento e objetivo antes de encaminhá-lo para nosso time de especialistas.`
                        )
                      }
                      className="rounded bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
                    >
                      Template: Qualificação
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAiPrompt(
                          `Você é o assistente executivo responsável pelo agendamento de reuniões. Explique brevemente o formato do atendimento e forneça o link de calendário para o lead marcar seu melhor horário.`
                        )
                      }
                      className="rounded bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
                    >
                      Template: Agendamento
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 p-3 text-xs leading-relaxed text-zinc-800 focus:border-brand-500 focus:outline-none"
                    placeholder="Instruções para o agente..."
                  />
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                  <div>
                    <span className="text-xs font-semibold text-zinc-800">
                      Limite de turnos de resposta no Direct:
                    </span>
                    <p className="text-[11px] text-zinc-500">
                      Após atingir o limite, a conversa pode ser repassada para atendimento humano.
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={aiTurns}
                    onChange={(e) => setAiTurns(Number(e.target.value))}
                    className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-center font-bold text-zinc-800"
                  />
                </div>
              </div>
            ) : (
              /* Configurações do Link Direto */
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Mensagem de Envio do Link
                  </label>
                  <input
                    type="text"
                    value={linkMessage}
                    onChange={(e) => setLinkMessage(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                    placeholder="Aqui está o seu link:"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    URL do Link / Destino
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Simulação Realista do Smartphone (Instagram) */}
        <div className="hidden lg:flex w-[380px] xl:w-[430px] border-l border-zinc-200 bg-zinc-100/70 p-6 flex-col items-center justify-center overflow-y-auto">
          <div className="mb-2 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Simulação em Tempo Real
            </span>
            <p className="text-[11px] text-zinc-500">
              Visualize como o lead interage com a automação no Instagram
            </p>
          </div>

          <InstagramPhoneMockup
            data={{
              accountName: igAccount?.name || "Carlos Silva Jr.",
              accountUsername: igAccount?.username || "ocarlossilvajr",
              accountAvatar: igAccount?.profile_picture_url,
              postImage: mediaUrl,
              postCaption: mediaCaption,
              triggerKeywords: keywords,
              publicCommentReply: publicReplyText,
              welcomeMessage: welcomeText,
              buttonText: buttonText,
              followUpType: followUpMode,
              followUpLink: linkUrl,
              followUpText:
                followUpMode === "ai"
                  ? "Olá! Consultei nossa base de dados oficial e posso te confirmar que temos todas as condições especiais disponíveis. Como posso te orientar melhor?"
                  : `${linkMessage}\n${linkUrl}`,
              knowledgeBaseName: selectedKb?.name || "Base de Conhecimento",
            }}
          />
        </div>
      </div>
    </div>
  );
}
