"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Calendar,
  MessageSquare,
  Shield,
  Layers,
  Check,
  Plus,
  Upload,
  Globe,
  FileText,
} from "lucide-react";
import { createAgentFromWizard, createQuickKnowledgeBaseAction } from "@/app/app/agents/actions";

interface KnowledgeBaseItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  docsCount: number;
}

export function AgentWizard({
  knowledgeBases,
  calendars,
}: {
  knowledgeBases: KnowledgeBaseItem[];
  calendars: Array<{ id: string; provider: string; account_email: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("Sofia - Assistente Virtual");
  const [role, setRole] = useState("Especialista em Atendimento e Vendas");
  const [targetAudience, setTargetAudience] = useState("Clientes e leads interessados nos serviços e produtos");
  const [toneOfVoice, setToneOfVoice] = useState("consultative");
  const [primaryObjective, setPrimaryObjective] = useState("hybrid");
  const [objectiveDescription, setObjectiveDescription] = useState(
    "Atender com rapidez, tirar dúvidas frequentes com base nos documentos da empresa e direcionar para agendamento de reuniões."
  );
  const [basesList, setBasesList] = useState<KnowledgeBaseItem[]>(knowledgeBases);
  const [selectedBases, setSelectedBases] = useState<string[]>(knowledgeBases.map((k) => k.id));
  const [channels, setChannels] = useState<string[]>(["instagram", "whatsapp"]);
  const [enableCalendar, setEnableCalendar] = useState(calendars.length > 0);
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || "");
  const [instructions, setInstructions] = useState(
    "Responda de forma ágil, empática e prestativa. Quando o cliente tiver dúvidas de valores ou prazos, consulte a base de conhecimento. Sempre convide para agendar uma reunião ou falar com um consultor humano se necessário."
  );

  // Inline Knowledge Base Creation State
  const [kbMode, setKbMode] = useState<"select" | "create">("select");
  const [newKbName, setNewKbName] = useState("");
  const [newKbCategory, setNewKbCategory] = useState("Comercial");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newSourceType, setNewSourceType] = useState("txt");
  const [newContent, setNewContent] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creatingKb, setCreatingKb] = useState(false);
  const [kbSuccessMsg, setKbSuccessMsg] = useState<string | null>(null);

  const toggleBase = (id: string) => {
    setSelectedBases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]
    );
  };

  async function handleFinish() {
    setLoading(true);
    setError(null);
    try {
      const res = await createAgentFromWizard({
        name,
        role,
        targetAudience,
        toneOfVoice,
        primaryObjective,
        objectiveDescription,
        instructions,
        knowledgeBaseIds: selectedBases,
        channels,
        calendarConnectionId: enableCalendar ? calendarId || null : null,
        guardrails: {
          handoff_keywords: ["falar com humano", "especialista", "atendente", "humano"],
          protect_pricing: false,
        },
      });

      if (!res.ok) {
        setError(res.error ?? "Erro ao criar agente.");
      } else {
        router.push("/app/agents");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInlineKb() {
    if (!newKbName.trim()) {
      setError("Informe o nome da base de conhecimento.");
      return;
    }
    setCreatingKb(true);
    setError(null);
    setKbSuccessMsg(null);
    try {
      const res = await createQuickKnowledgeBaseAction({
        name: newKbName,
        category: newKbCategory || "Geral",
        docTitle: newDocTitle || newKbName,
        sourceType: newSourceType,
        content: newContent,
        url: newUrl,
      });

      if (res.ok && res.base) {
        setBasesList((prev) => [res.base, ...prev]);
        setSelectedBases((prev) => [...prev, res.base.id]);
        setKbSuccessMsg(`Base "${res.base.name}" criada e vinculada com sucesso!`);
        setNewKbName("");
        setNewDocTitle("");
        setNewContent("");
        setNewUrl("");
        setKbMode("select");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar base de conhecimento.");
    } finally {
      setCreatingKb(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDocTitle) setNewDocTitle(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") setNewSourceType("pdf");
    else if (ext === "docx" || ext === "doc") setNewSourceType("docx");
    else if (ext === "xlsx" || ext === "xls") setNewSourceType("xlsx");
    else if (ext === "csv") setNewSourceType("csv");
    else setNewSourceType("txt");

    // Ler texto do arquivo
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNewContent(text || `Arquivo: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-8">
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        {[
          { num: 1, label: "Identidade" },
          { num: 2, label: "Objetivo & Tom" },
          { num: 3, label: "Base de Conhecimento" },
          { num: 4, label: "Canais & Agenda" },
          { num: 5, label: "Revisão & Ativação" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s.num
                  ? "bg-brand-600 text-white"
                  : step > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span
              className={`hidden sm:inline text-xs font-medium ${
                step === s.num ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

      {/* Passo 1: Identidade */}
      {step === 1 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand-600" />
              Etapa 1: Identidade e Perfil do Agente
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Defina como seu agente se apresentará e qual será a sua função principal.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Nome do Agente *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sofia - Consultora Comercial"
                className="input w-full text-sm"
              />
            </div>

            <div>
              <label className="label">Cargo / Especialidade</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Consultor Especialista em Imóveis / SDR de Vendas"
                className="input w-full text-sm"
              />
            </div>

            <div>
              <label className="label">Público-Alvo</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Empreendedores e gestores de pequenas empresas"
                className="input w-full text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Passo 2: Objetivo & Tom de Voz */}
      {step === 2 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Etapa 2: Objetivo e Personalidade
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Escolha a postura do agente e o tom de voz com o qual ele se comunicará.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Tom de Voz</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { key: "consultative", label: "Consultivo & Especialista", desc: "Didático, confiável e atencioso" },
                  { key: "friendly", label: "Amigável & Empático", desc: "Próximo, acolhedor e caloroso" },
                  { key: "direct", label: "Direto & Objetivo", desc: "Rápido, sucinto e pragmático" },
                  { key: "formal", label: "Corporativo & Formal", desc: "Tradicional, polido e refinado" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setToneOfVoice(t.key)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      toneOfVoice === t.key
                        ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="font-semibold text-xs text-zinc-900">{t.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Objetivo Principal</label>
              <textarea
                rows={3}
                value={objectiveDescription}
                onChange={(e) => setObjectiveDescription(e.target.value)}
                placeholder="Descreva o que o agente deve atingir durante a conversa..."
                className="input w-full text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Passo 3: Base de Conhecimento */}
      {step === 3 && (
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-600" />
                Etapa 3: Vincular Base de Conhecimento
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Selecione bases existentes ou crie uma nova enviando arquivos (PDF, DOCX, TXT, CSV, XLS) ou links.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setKbMode("select")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  kbMode === "select" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Selecionar Existente ({basesList.length})
              </button>
              <button
                type="button"
                onClick={() => setKbMode("create")}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                  kbMode === "create" ? "bg-white text-brand-600 shadow-sm font-semibold" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Plus className="h-3.5 w-3.5" /> Criar Nova Base
              </button>
            </div>
          </div>

          {kbSuccessMsg && (
            <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              {kbSuccessMsg}
            </div>
          )}

          {kbMode === "select" ? (
            <div>
              {basesList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center space-y-3">
                  <p className="text-sm text-zinc-500">Nenhuma base de conhecimento criada ainda no seu workspace.</p>
                  <button
                    type="button"
                    onClick={() => setKbMode("create")}
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Criar Minha Primeira Base Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {basesList.map((kb) => {
                      const isSelected = selectedBases.includes(kb.id);
                      return (
                        <button
                          key={kb.id}
                          type="button"
                          onClick={() => toggleBase(kb.id)}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20"
                              : "border-zinc-200 bg-white hover:bg-zinc-50"
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              isSelected ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-300"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-zinc-900 truncate">{kb.name}</span>
                              <span className="rounded bg-zinc-100 px-1 text-[10px] text-zinc-600">{kb.category}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{kb.docsCount} documento(s) indexado(s)</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setKbMode("create")}
                      className="text-xs text-brand-600 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Adicionar outra base com novos arquivos
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Criar Nova Base de Conhecimento e Anexar Arquivos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Nome da Nova Base *</label>
                  <input
                    type="text"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    placeholder="Ex: Tabela de Preços e Catálogo 2026"
                    className="input w-full text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <input
                    type="text"
                    value={newKbCategory}
                    onChange={(e) => setNewKbCategory(e.target.value)}
                    placeholder="Ex: Comercial / Suporte"
                    className="input w-full text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="label">Tipo de Conteúdo / Fonte</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "txt", label: "Arquivo Upload", icon: Upload, desc: "PDF, DOCX, TXT, CSV, XLS" },
                    { key: "manual", label: "Texto / Manual", icon: FileText, desc: "Digite ou cole informações" },
                    { key: "url", label: "Site / URL", icon: Globe, desc: "Link para raspagem web" },
                  ].map((src) => {
                    const active = newSourceType === src.key || (src.key === "txt" && ["pdf", "docx", "xlsx", "csv", "txt"].includes(newSourceType));
                    const Icon = src.icon;
                    return (
                      <button
                        key={src.key}
                        type="button"
                        onClick={() => setNewSourceType(src.key)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          active ? "border-brand-600 bg-white shadow-sm ring-1 ring-brand-500" : "border-zinc-200 bg-zinc-100 hover:bg-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-brand-600 mb-1" />
                        <div className="text-xs font-semibold text-zinc-900">{src.label}</div>
                        <div className="text-[10px] text-zinc-500">{src.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {["txt", "pdf", "docx", "xlsx", "csv"].includes(newSourceType) && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Selecione o Arquivo (PDF, DOCX, TXT, CSV, XLSX)</label>
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx,.doc,.xlsx,.xls,.csv,.md"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer bg-white border border-zinc-200 rounded-lg p-1"
                    />
                  </div>
                  <div>
                    <label className="label">Título do Documento</label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Ex: Tabela de Preços e Serviços.pdf"
                      className="input w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="label">Conteúdo / Prévia Extraída</label>
                    <textarea
                      rows={3}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Conteúdo que o agente usará..."
                      className="input w-full text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}

              {newSourceType === "manual" && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Título do Documento / FAQ</label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Ex: Dúvidas Frequentes sobre Prazos e Pagamento"
                      className="input w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="label">Texto com Informações</label>
                    <textarea
                      rows={5}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Cole aqui as regras de negócio, tabelas, horários de atendimento, políticas de cancelamento..."
                      className="input w-full text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {newSourceType === "url" && (
                <div className="space-y-3">
                  <div>
                    <label className="label">URL do Site / Documento Online</label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://suaempresa.com.br/produtos"
                      className="input w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="label">Título de Referência</label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Ex: Página de Produtos do Site"
                      className="input w-full text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setKbMode("select")}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={creatingKb || !newKbName.trim()}
                  onClick={handleCreateInlineKb}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {creatingKb ? "Processando e Indexando..." : "+ Criar e Vincular à Este Agente"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Passo 4: Canais & Agenda */}
      {step === 4 && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-600" />
              Etapa 4: Canais de Atendimento e Integração de Agenda
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Escolha onde o agente atenderá e se ele poderá marcar reuniões no Google Meet ou Teams.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Canais Ativos</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { key: "whatsapp", label: "WhatsApp (Meta)", icon: "🟢" },
                  { key: "instagram", label: "Instagram Direct", icon: "🟣" },
                  { key: "webchat", label: "Chat do Site / Inbox", icon: "🔵" },
                ].map((ch) => {
                  const active = channels.includes(ch.key);
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => toggleChannel(ch.key)}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-brand-600 bg-brand-50/50 font-medium text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                      }`}
                    >
                      <span>{ch.icon}</span>
                      <span className="text-xs">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-zinc-900">Agendamento de Reuniões Automático</div>
                  <div className="text-xs text-zinc-500">
                    O agente pode verificar horários livres e enviar convites com links do Google Meet ou Teams.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableCalendar}
                  onChange={(e) => setEnableCalendar(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-600"
                />
              </div>

              {enableCalendar && (
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200">
                  <label className="label">Agenda Conectada</label>
                  {calendars.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Nenhuma agenda conectada ainda. Você pode configurar na aba de Conexões. Um link do Google Meet será gerado por padrão.
                    </p>
                  ) : (
                    <select
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      className="input w-full text-xs bg-white"
                    >
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.provider === "google" ? "Google Calendar" : "Microsoft Outlook"} ({c.account_email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Passo 5: Revisão & Publicação */}
      {step === 5 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-600" />
              Etapa 5: Instruções e Ativação
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Revise o comportamento do agente antes de colocá-lo para atender.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Instruções Finais para a IA</label>
              <textarea
                rows={5}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="input w-full text-sm font-mono"
              />
            </div>

            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <strong>Pronto para Atendimento:</strong> O agente responderá com as informações da Base de Conhecimento, transbordará para atendimento humano caso solicitado ("falar com atendente") e poderá agendar reuniões com envio de link online.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botões de Navegação */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
        <button
          type="button"
          disabled={step === 1 || loading}
          onClick={() => setStep((s) => s - 1)}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            Avançar <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleFinish}
            className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
          >
            {loading ? "Publicando Agente..." : "Publicar e Ativar Agente ✓"}
          </button>
        )}
      </div>
    </div>
  );
}

