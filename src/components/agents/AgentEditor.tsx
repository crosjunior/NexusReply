"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Sparkles,
  ArrowLeft,
  Save,
  Rocket,
  History,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  Eye,
  X,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  publishAgentVersionAction,
  saveAgentDraftAction,
  rollbackAgentVersionAction,
  toggleAgentStatus,
} from "@/app/app/agents/actions";
import type { AgentData, AgentVersion } from "@/lib/agents/types";

interface KnowledgeBaseItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  docsCount: number;
}

interface CalendarItem {
  id: string;
  provider: string;
  account_email: string;
}

export function AgentEditor({
  agent,
  knowledgeBases,
  calendars,
}: {
  agent: AgentData;
  knowledgeBases: KnowledgeBaseItem[];
  calendars: CalendarItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "history">("edit");
  const [isPending, startTransition] = useTransition();

  const versions: AgentVersion[] = Array.isArray(agent.guardrails?.versions)
    ? agent.guardrails.versions
    : [
        {
          version: 1,
          name: agent.name,
          role: agent.role,
          target_audience: agent.target_audience,
          tone_of_voice: agent.tone_of_voice || "consultative",
          primary_objective: agent.primary_objective || "hybrid",
          objective_description: agent.objective_description,
          instructions: agent.instructions || "",
          knowledge_base_ids: agent.knowledge_base_ids || [],
          channels: agent.channels || ["instagram", "whatsapp"],
          calendar_connection_id: agent.calendar_connection_id,
          guardrails: agent.guardrails,
          change_summary: "Versão inicial",
          published_at: agent.created_at,
          created_at: agent.created_at,
          is_active: true,
        },
      ];

  const activeVersion =
    versions.find((v) => v.is_active) || versions[versions.length - 1];
  const draft = agent.guardrails?.draft;

  // Estado dos campos do formulário (inicia com o rascunho se houver, ou a versão ativa)
  const initialSource = draft || activeVersion;

  const [name, setName] = useState(initialSource.name || agent.name);
  const [role, setRole] = useState(initialSource.role || agent.role || "");
  const [targetAudience, setTargetAudience] = useState(
    initialSource.target_audience || agent.target_audience || ""
  );
  const [toneOfVoice, setToneOfVoice] = useState(
    initialSource.tone_of_voice || agent.tone_of_voice || "consultative"
  );
  const [primaryObjective, setPrimaryObjective] = useState(
    initialSource.primary_objective || agent.primary_objective || "hybrid"
  );
  const [objectiveDescription, setObjectiveDescription] = useState(
    initialSource.objective_description || agent.objective_description || ""
  );
  const [instructions, setInstructions] = useState(
    initialSource.instructions || agent.instructions || ""
  );
  const [selectedBases, setSelectedBases] = useState<string[]>(
    initialSource.knowledge_base_ids || agent.knowledge_base_ids || []
  );
  const [channels, setChannels] = useState<string[]>(
    initialSource.channels || agent.channels || ["instagram", "whatsapp"]
  );
  const [calendarId, setCalendarId] = useState<string>(
    initialSource.calendar_connection_id || agent.calendar_connection_id || ""
  );
  const [handoffKeywords, setHandoffKeywords] = useState<string>(
    (
      (agent.guardrails?.handoff_keywords as string[]) || [
        "falar com humano",
        "especialista",
      ]
    ).join(", ")
  );

  // Modal de Publicação
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  // Modal de Inspeção de Versão Antiga
  const [inspectingVersion, setInspectingVersion] = useState<AgentVersion | null>(
    null
  );

  function showToast(text: string, ok: boolean = true) {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  }

  const toggleBase = (id: string) => {
    setSelectedBases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch)
        ? prev.length > 1
          ? prev.filter((x) => x !== ch)
          : prev
        : [...prev, ch]
    );
  };

  // Salvar Rascunho
  function handleSaveDraft() {
    startTransition(async () => {
      const draftData = {
        name,
        role,
        target_audience: targetAudience,
        tone_of_voice: toneOfVoice,
        primary_objective: primaryObjective,
        objective_description: objectiveDescription,
        instructions,
        knowledge_base_ids: selectedBases,
        channels,
        calendar_connection_id: calendarId || null,
      };

      const res = await saveAgentDraftAction(agent.id, draftData);
      if (res.ok) {
        showToast("Rascunho salvo com sucesso! (Não afeta o atendimento ao vivo)");
      } else {
        showToast("Erro ao salvar rascunho", false);
      }
    });
  }

  // Publicar Nova Versão
  function handlePublish() {
    startTransition(async () => {
      const keywordsArray = handoffKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await publishAgentVersionAction(agent.id, {
        name,
        role,
        targetAudience,
        toneOfVoice,
        primaryObjective,
        objectiveDescription,
        instructions,
        knowledgeBaseIds: selectedBases,
        channels,
        calendarConnectionId: calendarId || null,
        guardrails: {
          ...agent.guardrails,
          handoff_keywords: keywordsArray,
        },
        changeSummary:
          changeSummary.trim() || `Atualização de instruções e configurações`,
      });

      setShowPublishModal(false);
      setChangeSummary("");

      if (res.ok) {
        showToast(`Versão ${res.version} publicada e ativa em produção!`);
        router.refresh();
      } else {
        showToast(res.error || "Erro ao publicar versão", false);
      }
    });
  }

  // Restaurar Versão Antiga (Rollback)
  function handleRollback(verNum: number) {
    if (
      !confirm(
        `Tem certeza que deseja restaurar a Versão ${verNum}? Uma nova versão ativa será gerada e entrará em vigor imediatamente.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await rollbackAgentVersionAction(agent.id, verNum);
      if (res.ok) {
        showToast(
          `Versão ${verNum} restaurada com sucesso como Versão ${res.version}!`
        );
        router.refresh();
      } else {
        showToast(res.error || "Erro ao restaurar versão", false);
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      {/* Top Header */}
      <div>
        <Link
          href="/app/agents"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Agentes
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-md shadow-brand-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900">{name}</h1>
                <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                  v{activeVersion?.version || 1} Ativa
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    agent.status === "active"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  ● {agent.status === "active" ? "Em Produção" : "Pausado"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {role || "Assistente Virtual de Atendimento"} •{" "}
                {versions.length} {versions.length === 1 ? "versão" : "versões"} registradas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm transition"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar Rascunho
            </button>

            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:bg-brand-500 transition"
            >
              <Rocket className="h-4 w-4" />
              Publicar Nova Versão
            </button>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div
          className={`rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-md transition ${
            toastMsg.ok ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`pb-3 px-4 border-b-2 transition ${
            tab === "edit"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          ⚙️ Configurações & Prompt do Agente
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`pb-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
            tab === "history"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <History className="h-4 w-4" />
          Histórico de Versões ({versions.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA DE EDIÇÃO */}
      {tab === "edit" && (
        <div className="space-y-6">
          {/* Alerta de Publicação */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-xs text-brand-900 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Como funciona a edição e publicação de versões:</span>
              <p className="text-zinc-600 mt-0.5 leading-relaxed">
                Você pode fazer todas as alterações necessárias com tranquilidade. Seu agente em produção continuará utilizando a versão anterior até que você clique em <strong>Publicar Nova Versão</strong>. Cada publicação cria uma nova versão histórica, mantendo o histórico completo e permitindo reverter para qualquer versão passada a qualquer momento.
              </p>
            </div>
          </div>

          {/* Dados Gerais */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              1. Identidade e Papel do Agente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome do Agente *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="Ex: Sofia - Assistente Virtual"
                />
              </div>
              <div>
                <label className="label">Papel / Especialidade</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="Ex: Especialista em Atendimento e Vendas"
                />
              </div>
              <div>
                <label className="label">Público-Alvo</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="Ex: Leads qualificados, clientes da clínica"
                />
              </div>
              <div>
                <label className="label">Tom de Voz</label>
                <select
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  className="input w-full text-sm font-medium"
                >
                  <option value="consultative">Consultivo e Profissional</option>
                  <option value="friendly">Amigável, Empático e Descontraído</option>
                  <option value="direct">Objetivo, Rápido e Direto</option>
                  <option value="formal">Corporativo e Formal</option>
                  <option value="persuasive">Vendedor e Persuasivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Instruções do Agente */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h2 className="text-sm font-bold text-zinc-900">
                2. Instruções, Persona e Regras do Agente (Prompt)
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>Modelos:</span>
                <button
                  type="button"
                  onClick={() =>
                    setInstructions(
                      `1. PAPEL E IDENTIDADE:\nVocê é o consultor oficial de vendas da nossa empresa. Seja simpático, didático e seguro.\n\n2. OBJETIVO:\nTirar dúvidas sobre serviços, preços e planos utilizando nossa Base de Conhecimento, e convidar para o próximo passo.\n\n3. REGRAS:\n- Baseie-se apenas nos fatos dos documentos cadastrados.\n- Faça uma pergunta por vez para manter a conversa fluida.`
                    )
                  }
                  className="text-brand-600 hover:underline font-medium"
                >
                  Vendas & FAQ
                </button>
                •
                <button
                  type="button"
                  onClick={() =>
                    setInstructions(
                      `1. PAPEL:\nVocê é o atendente de qualificação de leads.\n\n2. OBJETIVO:\nFazer perguntas estratégicas para entender as necessidades, tamanho da empresa e orçamento do cliente antes de transferir para a equipe comercial.`
                    )
                  }
                  className="text-brand-600 hover:underline font-medium"
                >
                  Qualificação
                </button>
                •
                <button
                  type="button"
                  onClick={() =>
                    setInstructions(
                      `1. PAPEL:\nVocê é o assistente executivo responsável pelo agendamento de reuniões.\n\n2. OBJETIVO:\nApresentar os horários disponíveis e enviar o link de agendamento online para confirmação imediata.`
                    )
                  }
                  className="text-brand-600 hover:underline font-medium"
                >
                  Agendamento
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="input w-full text-xs font-mono leading-relaxed"
              placeholder="Digite aqui as regras de comportamento do agente..."
            />
          </div>

          {/* Bases de Conhecimento Conectadas */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-600" />
                3. Bases de Conhecimento Conectadas ao Agente
              </h2>
              <a
                href="/app/knowledge"
                target="_blank"
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                + Gerenciar Bases de Conhecimento
              </a>
            </div>

            {knowledgeBases.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Nenhuma base criada. Crie bases no menu lateral para fornecer dados ao agente.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {knowledgeBases.map((kb) => {
                  const isChecked = selectedBases.includes(kb.id);
                  return (
                    <div
                      key={kb.id}
                      onClick={() => toggleBase(kb.id)}
                      className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition ${
                        isChecked
                          ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900 truncate">
                            {kb.name}
                          </span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[9px] font-semibold text-zinc-600">
                            {kb.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {kb.docsCount} {kb.docsCount === 1 ? "documento indexado" : "documentos indexados"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Canais e Calendário */}
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              4. Canais de Atendimento & Agendamento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Canais Ativos</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                    <input
                      type="checkbox"
                      checked={channels.includes("instagram")}
                      onChange={() => toggleChannel("instagram")}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    Instagram Direct
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                    <input
                      type="checkbox"
                      checked={channels.includes("whatsapp")}
                      onChange={() => toggleChannel("whatsapp")}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    WhatsApp
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Calendário para Agendamentos</label>
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="input w-full text-xs font-medium"
                >
                  <option value="">Sem agendamento automático</option>
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.provider.toUpperCase()} - {cal.account_email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Palavras-chave para Transferência para Humano (Handoff)</label>
                <input
                  type="text"
                  value={handoffKeywords}
                  onChange={(e) => setHandoffKeywords(e.target.value)}
                  className="input w-full text-xs"
                  placeholder="falar com atendente, humano, especialista, suporte"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Separe as palavras por vírgula. Quando o usuário digitar qualquer uma delas, a IA pausa e transfere o atendimento.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA DE HISTÓRICO DE VERSÕES */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Histórico Completo de Versões
              </h2>
              <p className="text-xs text-zinc-500">
                Todas as alterações publicadas são arquivadas. Você pode restaurar qualquer versão anterior com 1 clique.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[...versions].reverse().map((v) => {
              const isCurrent = v.is_active;
              return (
                <div
                  key={v.version}
                  className={`card p-5 transition ${
                    isCurrent
                      ? "border-2 border-emerald-500 bg-emerald-50/20 shadow-md"
                      : "hover:border-zinc-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">
                          Versão {v.version}
                        </span>
                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> ATIVA EM PRODUÇÃO
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                            Versão Anterior (Arquivada)
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {new Date(v.published_at || v.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-zinc-700">
                        {v.change_summary || "Alterações de configuração e prompt"}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                        <span>Tom: <strong>{v.tone_of_voice}</strong></span>
                        <span>•</span>
                        <span>{v.knowledge_base_ids?.length || 0} bases conectadas</span>
                        <span>•</span>
                        <span>Canais: {(v.channels || []).join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setInspectingVersion(v)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Detalhes
                      </button>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRollback(v.version)}
                          disabled={isPending}
                          className="btn-primary text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restaurar Versão
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE PUBLICAÇÃO DE NOVA VERSÃO */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-brand-600" />
                <h3 className="text-base font-bold text-zinc-900">
                  Publicar Nova Versão do Agente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Ao publicar, uma nova versão será gerada (<strong>Versão {versions.length + 1}</strong>) e se tornará a única versão ativa no WhatsApp e Instagram. As versões anteriores continuam salvas no histórico.
            </p>

            <div>
              <label className="label">O que mudou nesta versão? (Opcional)</label>
              <textarea
                rows={3}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Ex: Ajustei o tom de voz para mais acolhedor e adicionei a base de produtos..."
                className="input w-full text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPending}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Rocket className="h-4 w-4" />
                {isPending ? "Publicando..." : "Confirmar & Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INSPEÇÃO DE VERSÃO HISTÓRICA */}
      {inspectingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  Detalhes da Versão {inspectingVersion.version}
                  {inspectingVersion.is_active && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 font-bold">
                      Ativa
                    </span>
                  )}
                </h3>
                <span className="text-xs text-zinc-400">
                  Publicada em {new Date(inspectingVersion.published_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div>
                <span className="font-bold text-zinc-800 block mb-1">Resumo das Alterações:</span>
                <p className="bg-zinc-50 p-2.5 rounded-lg text-zinc-700 border border-zinc-200">
                  {inspectingVersion.change_summary || "Sem descrição"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-zinc-800 block">Nome do Agente:</span>
                  <span className="text-zinc-600">{inspectingVersion.name}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-800 block">Cargo / Papel:</span>
                  <span className="text-zinc-600">{inspectingVersion.role || "-"}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-800 block">Tom de Voz:</span>
                  <span className="text-zinc-600">{inspectingVersion.tone_of_voice}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-800 block">Bases Vinculadas:</span>
                  <span className="text-zinc-600">
                    {inspectingVersion.knowledge_base_ids?.length || 0} bases
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-zinc-800 block mb-1">Instruções / Prompt:</span>
                <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {inspectingVersion.instructions}
                </pre>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="btn-secondary text-xs"
              >
                Fechar
              </button>

              {!inspectingVersion.is_active && (
                <button
                  type="button"
                  onClick={() => {
                    const ver = inspectingVersion.version;
                    setInspectingVersion(null);
                    handleRollback(ver);
                  }}
                  className="btn-primary text-xs bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar esta Versão para Produção
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

