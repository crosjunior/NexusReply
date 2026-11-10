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
} from "lucide-react";
import { createAgentFromWizard } from "@/app/app/agents/actions";

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
  const [selectedBases, setSelectedBases] = useState<string[]>(knowledgeBases.map((k) => k.id));
  const [channels, setChannels] = useState<string[]>(["instagram", "whatsapp"]);
  const [enableCalendar, setEnableCalendar] = useState(calendars.length > 0);
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || "");
  const [instructions, setInstructions] = useState(
    "Responda de forma ágil, empática e prestativa. Quando o cliente tiver dúvidas de valores ou prazos, consulte a base de conhecimento. Sempre convide para agendar uma reunião ou falar com um consultor humano se necessário."
  );

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
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
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-600" />
              Etapa 3: Vincular Bases de Conhecimento
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Selecione as bases que o agente terá permissão para pesquisar e citar nas respostas.
            </p>
          </div>

          {knowledgeBases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
              Nenhuma base de conhecimento criada ainda.
              <br />
              Você poderá adicionar materiais e arquivos na página de Base de Conhecimento a qualquer momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {knowledgeBases.map((kb) => {
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
                      <div className="text-[11px] text-zinc-500 mt-0.5">{kb.docsCount} documentos indexados</div>
                    </div>
                  </button>
                );
              })}
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

