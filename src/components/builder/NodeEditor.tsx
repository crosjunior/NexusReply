"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Sparkles,
  Film,
  Image as ImageIcon,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Bot,
  Wand2,
  Info,
  ExternalLink,
} from "lucide-react";
import { uid } from "@/lib/flow-templates";
import type {
  ActionData,
  ActionItem,
  AiData,
  ConditionData,
  DelayData,
  FlowNode,
  InputData,
  MessageData,
  StartData,
  TargetMedia,
  TriggerConfig,
  TriggerType,
} from "@/lib/engine/types";
import { NODE_META, TRIGGER_LABEL } from "./nodes";
import { COMPONENT_DETAILS } from "./component-info";
import { MediaSelectorModal } from "./MediaSelectorModal";

interface Props {
  node: FlowNode;
  onChange: (data: FlowNode["data"], removedHandles?: string[]) => void;
  onDelete: () => void;
  onClose: () => void;
}

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function NodeEditor({ node, onChange, onDelete, onClose }: Props) {
  const meta = NODE_META[node.type];
  const details = COMPONENT_DETAILS[node.type];
  const [showGuide, setShowGuide] = useState(true);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${meta.color}`}>
          <meta.icon className="h-4 w-4" />
        </span>
        <span className="font-medium">{meta.label}</span>
        <button className="btn-ghost ml-auto px-2" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Guia Didático e Contextual do Componente Selecionado */}
        {details && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-900 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-brand-600" />
                Como funciona este bloco
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] font-medium text-brand-700 hover:text-brand-900"
              >
                {showGuide ? "Recolher" : "Ver guia"}
              </button>
            </div>

            {showGuide && (
              <div className="space-y-2 pt-1 border-t border-brand-100/70 text-zinc-700">
                <div>
                  <span className="font-semibold text-zinc-900 text-[11px] block">🎯 Objetivo:</span>
                  <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">{details.objective}</p>
                </div>
                <div>
                  <span className="font-semibold text-zinc-900 text-[11px] block">⚙️ O que ele faz:</span>
                  <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">{details.whatItDoes}</p>
                </div>
                <div className="rounded-lg bg-white/90 p-2 border border-brand-100">
                  <span className="font-semibold text-brand-900 text-[11px] block">💡 Exemplo no contexto:</span>
                  <p className="text-[11px] text-zinc-700 leading-snug mt-0.5 italic">&quot;{details.contextExample}&quot;</p>
                </div>
              </div>
            )}
          </div>
        )}
        {node.type === "start" && <StartEditor data={node.data as StartData} onChange={onChange} />}
        {node.type === "message" && <MessageEditor data={node.data as MessageData} onChange={onChange} />}
        {node.type === "input" && <InputEditor data={node.data as InputData} onChange={onChange} />}
        {node.type === "condition" && <ConditionEditor data={node.data as ConditionData} onChange={onChange} />}
        {node.type === "action" && <ActionEditor data={node.data as ActionData} onChange={onChange} />}
        {node.type === "delay" && <DelayEditor data={node.data as DelayData} onChange={onChange} />}
        {node.type === "ai" && <AiEditor data={node.data as AiData} onChange={onChange} />}
      </div>
      {node.type !== "start" && (
        <div className="border-t border-zinc-200 p-3">
          <button className="btn-danger w-full" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Excluir bloco
          </button>
        </div>
      )}
    </div>
  );
}

type EP<T> = { data: T; onChange: (d: T, removedHandles?: string[]) => void };

// ---------------------------------------------------------------------
function StartEditor({ data, onChange }: EP<StartData>) {
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const set = (triggers: TriggerConfig[]) => onChange({ ...data, triggers });
  const upd = (i: number, patch: Partial<TriggerConfig>) =>
    set(data.triggers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const add = (type: TriggerType) =>
    set([
      ...data.triggers,
      {
        id: uid("t"),
        type,
        keywords: [],
        match: type === "default_reply" || type === "story_mention" ? "any" : "contains",
        publicReplies: type === "comment_keyword" ? ["Te mandei no direct! 📩"] : undefined,
        cooldownHours: type === "default_reply" ? 12 : undefined,
        scheduleType: "permanent",
      },
    ]);

  const getScheduleStatus = (t: TriggerConfig) => {
    if (t.scheduleType !== "scheduled") {
      return { label: "Permanente (Sempre Ativa)", tone: "emerald" };
    }
    const now = new Date();
    if (t.startsAt) {
      const s = new Date(t.startsAt);
      if (!isNaN(s.getTime()) && now < s) {
        return { label: `Agendada para ${s.toLocaleDateString("pt-BR")}`, tone: "amber" };
      }
    }
    if (t.endsAt) {
      const e = new Date(t.endsAt);
      if (!isNaN(e.getTime())) {
        if (now > e) return { label: "Encerrada", tone: "zinc" };
        return {
          label: `Ativa até ${e.toLocaleDateString("pt-BR")} ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          tone: "emerald",
        };
      }
    }
    return { label: "Ativa com agendamento", tone: "emerald" };
  };

  return (
    <>
      <p className="text-xs text-zinc-500">O fluxo começa quando qualquer um destes gatilhos acontecer.</p>
      {data.triggers.map((t, i) => {
        const scheduleStatus = getScheduleStatus(t);

        return (
          <div key={t.id} className="space-y-4 rounded-xl border border-zinc-200 p-3.5 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-sm font-bold text-zinc-900">{TRIGGER_LABEL[t.type]}</span>
              <button
                className="text-zinc-400 hover:text-red-600 transition-colors"
                onClick={() => set(data.triggers.filter((_, j) => j !== i))}
                title="Excluir regra"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* SELETOR VISUAL DE PUBLICAÇÃO ALVO (POST, REELS OU STORY) */}
            {t.type === "comment_keyword" && (
              <div className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/20 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Publicação Alvo (ManyChat Style)
                  </label>
                  {t.targetMedia ? (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                      Post Específico
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">
                      Qualquer publicação
                    </span>
                  )}
                </div>

                {t.targetMedia ? (
                  <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-white p-2.5 shadow-sm">
                    {t.targetMedia.thumbnail_url ? (
                      <img
                        src={t.targetMedia.thumbnail_url}
                        alt="Miniatura"
                        className="h-12 w-12 rounded-lg object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-purple-600 px-1 py-0.2 text-[9px] font-bold text-white uppercase">
                          {t.targetMedia.media_type}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          ID: {t.targetMedia.id.slice(-6)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-800 truncate mt-0.5" title={t.targetMedia.caption}>
                        {(t.targetMedia.caption || "Sem legenda").slice(0, 30)}...
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {t.targetMedia.permalink || t.targetMedia.id ? (
                        <a
                          href={t.targetMedia.permalink || `https://www.instagram.com/p/${t.targetMedia.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                          title="Abrir publicação no Instagram"
                        >
                          Ver no Instagram <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setModalIndex(i)}
                        className="text-[11px] font-semibold text-zinc-600 hover:underline"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => upd(i, { targetMedia: undefined, mediaIds: [] })}
                        className="text-[11px] text-zinc-400 hover:text-red-500"
                      >
                        Qualquer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500 max-w-[200px]">
                      Ativo para qualquer Post, Reels ou Story da conta.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalIndex(i)}
                      className="btn-secondary text-xs py-1.5 px-3 border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Selecionar Post
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIGÊNCIA DA REGRA (PERMANENTE VS INÍCIO E FIM) */}
            <div className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-600" />
                  Vigência da Regra
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    scheduleStatus.tone === "emerald"
                      ? "bg-emerald-50 text-emerald-700"
                      : scheduleStatus.tone === "amber"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  ● {scheduleStatus.label}
                </span>
              </div>

              <div className="flex rounded-lg bg-zinc-200/60 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => upd(i, { scheduleType: "permanent" })}
                  className={`flex-1 rounded-md py-1 font-semibold transition-all ${
                    t.scheduleType !== "scheduled"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Permanente
                </button>
                <button
                  type="button"
                  onClick={() => upd(i, { scheduleType: "scheduled" })}
                  className={`flex-1 rounded-md py-1 font-semibold transition-all ${
                    t.scheduleType === "scheduled"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Definir Início e Fim
                </button>
              </div>

              {t.scheduleType === "scheduled" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                      Data e Hora de Início
                    </label>
                    <input
                      type="datetime-local"
                      value={t.startsAt || ""}
                      onChange={(e) => upd(i, { startsAt: e.target.value })}
                      className="input text-xs w-full py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                      Data e Hora de Fim
                    </label>
                    <input
                      type="datetime-local"
                      value={t.endsAt || ""}
                      onChange={(e) => upd(i, { endsAt: e.target.value })}
                      className="input text-xs w-full py-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* PALAVRAS-CHAVE */}
            {t.type !== "default_reply" && t.type !== "story_mention" && (
              <>
                <div>
                  <label className="label">Quando a mensagem</label>
                  <select
                    className="input text-xs"
                    value={t.match}
                    onChange={(e) => upd(i, { match: e.target.value as TriggerConfig["match"] })}
                  >
                    <option value="contains">contém a palavra-chave</option>
                    <option value="exact">é exatamente a palavra-chave</option>
                    <option value="any">qualquer texto</option>
                  </select>
                </div>
                {t.match !== "any" && (
                  <div>
                    <label className="label">Palavras-chave (separe por vírgula)</label>
                    <input
                      className="input text-xs"
                      defaultValue={t.keywords.join(", ")}
                      onBlur={(e) => upd(i, { keywords: list(e.target.value) })}
                      placeholder="EU QUERO, LINK, PREÇO"
                    />
                    <p className="mt-1 text-[11px] text-zinc-400">Ignora maiúsculas e acentos.</p>
                  </div>
                )}
              </>
            )}

            {/* RESPOSTAS PÚBLICAS NO COMENTÁRIO */}
            {t.type === "comment_keyword" && (
              <div>
                <label className="label">Respostas públicas no comentário (uma por linha, sorteada)</label>
                <textarea
                  className="input min-h-16 text-xs"
                  defaultValue={(t.publicReplies ?? []).join("\n")}
                  onBlur={(e) => upd(i, { publicReplies: lines(e.target.value) })}
                  placeholder="Te mandei no direct! 📩&#10;Dá uma olhada nas suas mensagens! 🚀"
                />
              </div>
            )}

            {t.type === "default_reply" && (
              <div>
                <label className="label">Não repetir para o mesmo contato por (horas)</label>
                <input
                  type="number"
                  min={0}
                  className="input text-xs"
                  value={t.cooldownHours ?? 12}
                  onChange={(e) => upd(i, { cooldownHours: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="grid grid-cols-1 gap-2 pt-2">
        {(Object.keys(TRIGGER_LABEL) as TriggerType[]).map((k) => (
          <button key={k} className="btn-secondary justify-start text-xs" onClick={() => add(k)}>
            <Plus className="h-4 w-4" /> Adicionar Gatilho: {TRIGGER_LABEL[k]}
          </button>
        ))}
      </div>

      {/* Modal Visual ManyChat para selecionar Post / Reels / Story */}
      <MediaSelectorModal
        isOpen={modalIndex !== null}
        selectedMediaId={modalIndex !== null ? data.triggers[modalIndex]?.targetMedia?.id : undefined}
        onClose={() => setModalIndex(null)}
        onSelect={(media) => {
          if (modalIndex !== null) {
            if (!media) {
              upd(modalIndex, { targetMedia: undefined, mediaIds: [] });
            } else {
              upd(modalIndex, {
                targetMedia: media,
                mediaIds: [media.id],
              });
            }
          }
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------
function MessageEditor({ data, onChange }: EP<MessageData>) {
  const len = data.text?.length ?? 0;
  const limit = data.buttons.length ? 640 : 1000;
  return (
    <>
      <div>
        <label className="label">Texto</label>
        <textarea className="input min-h-32" value={data.text} onChange={(e) => onChange({ ...data, text: e.target.value })} />
        <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
          <span>Variáveis: {"{{first_name}} {{username}} {{field.email}}"}</span>
          <span className={len > limit ? "text-red-600" : ""}>
            {len}/{limit}
          </span>
        </div>
      </div>
      <div>
        <label className="label">Imagem (URL https, opcional)</label>
        <input className="input" value={data.imageUrl ?? ""} onChange={(e) => onChange({ ...data, imageUrl: e.target.value || undefined })} placeholder="https://…/imagem.jpg" />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label mb-0">Botões ({data.buttons.length}/3)</span>
          <button
            className="text-xs text-brand-600 disabled:opacity-40"
            disabled={data.buttons.length >= 3}
            onClick={() => onChange({ ...data, buttons: [...data.buttons, { id: uid("b"), title: "", type: "postback" }] })}
          >
            + botão
          </button>
        </div>
        <div className="space-y-2">
          {data.buttons.map((b, i) => (
            <div key={b.id} className="space-y-2 rounded-lg border border-zinc-200 p-2">
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Título (até 20)"
                  maxLength={20}
                  value={b.title}
                  onChange={(e) => onChange({ ...data, buttons: data.buttons.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                />
                <button
                  className="text-zinc-400 hover:text-red-600"
                  onClick={() => onChange({ ...data, buttons: data.buttons.filter((_, j) => j !== i) }, [b.id])}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <select
                className="input"
                value={b.type}
                onChange={(e) =>
                  onChange(
                    { ...data, buttons: data.buttons.map((x, j) => (j === i ? { ...x, type: e.target.value as "postback" | "url" } : x)) },
                    e.target.value === "url" ? [b.id] : undefined,
                  )
                }
              >
                <option value="postback">Continua o fluxo</option>
                <option value="url">Abre link</option>
              </select>
              {b.type === "url" && (
                <input
                  className="input"
                  placeholder="https://"
                  value={b.url ?? ""}
                  onChange={(e) => onChange({ ...data, buttons: data.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label mb-0">Respostas rápidas ({data.quickReplies.length}/13)</span>
          <button
            className="text-xs text-brand-600 disabled:opacity-40"
            disabled={data.quickReplies.length >= 13}
            onClick={() => onChange({ ...data, quickReplies: [...data.quickReplies, { id: uid("q"), title: "" }] })}
          >
            + opção
          </button>
        </div>
        <div className="space-y-2">
          {data.quickReplies.map((q, i) => (
            <div key={q.id} className="flex gap-2">
              <input
                className="input"
                maxLength={20}
                placeholder="Opção"
                value={q.title}
                onChange={(e) => onChange({ ...data, quickReplies: data.quickReplies.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
              />
              <button
                className="text-zinc-400 hover:text-red-600"
                onClick={() => onChange({ ...data, quickReplies: data.quickReplies.filter((_, j) => j !== i) }, [q.id])}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">Cada botão ou resposta rápida vira uma saída no bloco — arraste para o próximo passo.</p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
function InputEditor({ data, onChange }: EP<InputData>) {
  return (
    <>
      <div>
        <label className="label">Pergunta</label>
        <textarea className="input min-h-24" value={data.question} onChange={(e) => onChange({ ...data, question: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Salvar no campo</label>
          <input className="input" value={data.field} onChange={(e) => onChange({ ...data, field: e.target.value.replace(/\W/g, "_").toLowerCase() })} />
        </div>
        <div>
          <label className="label">Validação</label>
          <select className="input" value={data.validation} onChange={(e) => onChange({ ...data, validation: e.target.value as InputData["validation"] })}>
            <option value="text">Texto livre</option>
            <option value="email">E-mail</option>
            <option value="phone">Telefone</option>
            <option value="number">Número</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Mensagem se a resposta for inválida</label>
        <input className="input" value={data.retryMessage} onChange={(e) => onChange({ ...data, retryMessage: e.target.value })} />
      </div>
      <div>
        <label className="label">Botão "pular" (opcional)</label>
        <input
          className="input"
          maxLength={20}
          value={data.skipLabel ?? ""}
          onChange={(e) => onChange({ ...data, skipLabel: e.target.value || undefined }, e.target.value ? undefined : ["skip"])}
          placeholder="Ex.: Pular"
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
function ConditionEditor({ data, onChange }: EP<ConditionData>) {
  const isTag = data.op === "has_tag" || data.op === "not_has_tag";
  return (
    <>
      <div>
        <label className="label">Regra</label>
        <select className="input" value={data.op} onChange={(e) => onChange({ ...data, op: e.target.value as ConditionData["op"] })}>
          <option value="has_tag">Contato tem a tag</option>
          <option value="not_has_tag">Contato não tem a tag</option>
          <option value="field_exists">Campo está preenchido</option>
          <option value="field_equals">Campo é igual a</option>
          <option value="field_contains">Campo contém</option>
        </select>
      </div>
      {isTag ? (
        <div>
          <label className="label">Tag</label>
          <input className="input" value={data.tag ?? ""} onChange={(e) => onChange({ ...data, tag: e.target.value })} />
        </div>
      ) : (
        <>
          <div>
            <label className="label">Campo</label>
            <input className="input" value={data.field ?? ""} onChange={(e) => onChange({ ...data, field: e.target.value })} placeholder="email" />
          </div>
          {data.op !== "field_exists" && (
            <div>
              <label className="label">Valor</label>
              <input className="input" value={data.value ?? ""} onChange={(e) => onChange({ ...data, value: e.target.value })} />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
function ActionEditor({ data, onChange }: EP<ActionData>) {
  const upd = (i: number, patch: Partial<ActionItem>) =>
    onChange({ ...data, actions: data.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  return (
    <>
      {data.actions.map((a, i) => (
        <div key={a.id} className="space-y-2 rounded-lg border border-zinc-200 p-2">
          <div className="flex gap-2">
            <select className="input" value={a.kind} onChange={(e) => upd(i, { kind: e.target.value as ActionItem["kind"] })}>
              <option value="add_tag">Adicionar tag</option>
              <option value="remove_tag">Remover tag</option>
              <option value="set_field">Definir campo</option>
              <option value="handoff">Transferir para humano</option>
              <option value="webhook">Enviar webhook (n8n, Make, CRM)</option>
            </select>
            <button className="text-zinc-400 hover:text-red-600" onClick={() => onChange({ ...data, actions: data.actions.filter((_, j) => j !== i) })}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {(a.kind === "add_tag" || a.kind === "remove_tag") && (
            <input className="input" placeholder="nome-da-tag" value={a.tag ?? ""} onChange={(e) => upd(i, { tag: e.target.value.trim().toLowerCase() })} />
          )}
          {a.kind === "set_field" && (
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="campo" value={a.field ?? ""} onChange={(e) => upd(i, { field: e.target.value })} />
              <input className="input" placeholder="valor" value={a.value ?? ""} onChange={(e) => upd(i, { value: e.target.value })} />
            </div>
          )}
          {a.kind === "webhook" && (
            <input className="input" placeholder="https://hooks…" value={a.url ?? ""} onChange={(e) => upd(i, { url: e.target.value })} />
          )}
        </div>
      ))}
      <button className="btn-secondary w-full" onClick={() => onChange({ ...data, actions: [...data.actions, { id: uid("a"), kind: "add_tag", tag: "" }] })}>
        <Plus className="h-4 w-4" /> Adicionar ação
      </button>
    </>
  );
}

// ---------------------------------------------------------------------
function DelayEditor({ data, onChange }: EP<DelayData>) {
  return (
    <div>
      <label className="label">Minutos de espera</label>
      <input type="number" min={1} max={1380} className="input" value={data.minutes} onChange={(e) => onChange({ ...data, minutes: Number(e.target.value) })} />
      <p className="mt-1 text-[11px] text-zinc-400">Máx. 23h — depois da janela de 24h a Meta bloqueia o envio.</p>
    </div>
  );
}

// ---------------------------------------------------------------------
interface PromptTemplate {
  id: string;
  title: string;
  desc: string;
  prompt: string;
  isCustom?: boolean;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "vendas",
    title: "Vendas & FAQ",
    desc: "Preços e serviços",
    prompt: `1. PAPEL E IDENTIDADE:
Você é o assistente virtual da conta @ocarlossilvajr. Seja simpático, objetivo e profissional.

2. OBJETIVO:
Tirar dúvidas de clientes sobre nossos serviços, preços, planos e prazos de entrega, sempre incentivando o fechamento.

3. INFORMAÇÕES E REGRAS:
Use as informações cadastradas na Base de Conhecimento. Nunca invente dados. Se não souber responder, sugira falar com um especialista humano.

4. FORMATO:
Respostas diretas, em parágrafos curtos (máx. 3 frases por parágrafo), com tom acolhedor e emojis moderados.`,
  },
  {
    id: "qualificacao",
    title: "Qualificação",
    desc: "Entender perfil",
    prompt: `1. PAPEL E IDENTIDADE:
Você é um consultor estratégico especialista em diagnóstico empresarial da equipe do Carlos Silva Jr.

2. OBJETIVO:
Fazer perguntas inteligentes para entender o momento, faturamento ou desafios da empresa do cliente e verificar se ele tem fit com nossa consultoria.

3. INFORMAÇÕES E REGRAS:
Conduza uma conversa fluida fazendo uma pergunta por vez. Apresente nossos diferenciais com base nos documentos da empresa.

4. FORMATO:
Mensagens objetivas, didáticas e consultivas.`,
  },
  {
    id: "agendamento",
    title: "Agendamento",
    desc: "Convidar p/ Meet",
    prompt: `1. PAPEL E IDENTIDADE:
Você é responsável pelo agendamento de reuniões estratégicas com a equipe do Carlos Silva Jr.

2. OBJETIVO:
Responder dúvidas pontuais do cliente e direcioná-lo para escolher um horário na agenda pelo link de reunião online.

3. INFORMAÇÕES E REGRAS:
Explique como funciona a sessão de alinhamento e passe o link do Google Meet / Teams para confirmação.

4. FORMATO:
Curto, amigável e convidativo.`,
  },
];

const RECOMMENDED_STRUCTURE_BOILERPLATE = `1. PAPEL E IDENTIDADE:
Você é o assistente virtual de [Nome da Empresa/Pessoa]. Seu tom de voz é acolhedor, consultivo e profissional.

2. OBJETIVO PRINCIPAL:
[Descreva o objetivo da conversa: ex. tirar dúvidas sobre nossos serviços e convidar para o link de agendamento].

3. INFORMAÇÕES E CONHECIMENTO:
Responda sempre com base nos documentos e links cadastrados na Base de Conhecimento. Se não encontrar a informação, seja transparente e sugira falar com um especialista humano.

4. FORMATO DAS RESPOSTAS:
- Seja breve e direto (mensagens de 2 a 4 linhas).
- Parágrafos curtos e espaçados para leitura fácil no celular.
- Use emojis com moderação (máx. 1 a 2 por mensagem).

5. REGRAS E LIMITES:
- Nunca invente preços, descontos ou condições não aprovadas.
- Se o cliente pedir para falar com um atendente, responda: "Vou avisar nossa equipe agora mesmo para te atender!"`;

function AiEditor({ data, onChange }: EP<AiData>) {
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("replyflow_custom_prompts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showNewModelModal, setShowNewModelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPromptText, setNewPromptText] = useState("");

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const applyPreset = (prompt: string) => {
    onChange({
      ...data,
      systemPrompt: prompt,
      conversational: true,
      maxTurns: 5,
    });
  };

  const handleSaveCustomTemplate = () => {
    if (!newTitle.trim()) return;
    const promptToSave = newPromptText.trim() || data.systemPrompt || RECOMMENDED_STRUCTURE_BOILERPLATE;
    const newTemplate: PromptTemplate = {
      id: "cust_" + Date.now(),
      title: newTitle.trim(),
      desc: newDesc.trim() || "Modelo personalizado",
      prompt: promptToSave,
      isCustom: true,
    };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    try {
      localStorage.setItem("replyflow_custom_prompts", JSON.stringify(updated));
    } catch {}
    setNewTitle("");
    setNewDesc("");
    setNewPromptText("");
    setShowNewModelModal(false);
    applyPreset(newTemplate.prompt);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem("replyflow_custom_prompts", JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Guia Explicativo do Componente de IA */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-700" />
          <h4 className="text-xs font-bold text-purple-950">Como Usar a IA para Responder no DM:</h4>
        </div>
        <p className="text-[11px] text-purple-900 leading-relaxed">
          Este bloco assume a conversa no Direct do Instagram quando o lead envia dúvidas. A IA consulta automaticamente as <strong>Bases de Conhecimento</strong> cadastradas no menu lateral e responde com sua persona, preços e links.
        </p>
      </div>

      {/* Modelos Prontos de Prompt */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
            <Wand2 className="h-3.5 w-3.5 text-brand-600" />
            Modelos Prontos de Instrução:
          </label>
          <button
            type="button"
            onClick={() => {
              setNewPromptText(data.systemPrompt || "");
              setShowNewModelModal(true);
            }}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            + Novo Modelo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {allTemplates.map((t) => (
            <div
              key={t.id}
              onClick={() => applyPreset(t.prompt)}
              className="group relative rounded-lg border border-zinc-200 bg-white p-2 text-left hover:border-purple-300 hover:bg-purple-50/20 transition-all text-xs cursor-pointer flex items-start justify-between gap-1"
            >
              <div className="min-w-0 flex-1">
                <span className="font-bold block text-zinc-800 truncate">{t.title}</span>
                <span className="text-[10px] text-zinc-400 block truncate">{t.desc}</span>
              </div>
              {t.isCustom && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomTemplate(t.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-0.5 transition-opacity"
                  title="Excluir este modelo personalizado"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal / Formulário de Novo Modelo de Instrução */}
      {showNewModelModal && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-950 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-brand-600" />
              Criar Novo Modelo de Instrução
            </span>
            <button
              type="button"
              onClick={() => setShowNewModelModal(false)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-0.5">Nome do Modelo *</label>
              <input
                type="text"
                placeholder="Ex: Suporte VIP & Garantia"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input w-full text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-0.5">Subtítulo / Objetivo</label>
              <input
                type="text"
                placeholder="Ex: Resolver dúvidas técnicas e trocas"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="input w-full text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 block mb-0.5">Instrução / Prompt</label>
              <textarea
                rows={4}
                placeholder="Digite o texto de instruções deste modelo..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="input w-full text-xs font-mono bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-brand-100">
            <button
              type="button"
              onClick={() => setShowNewModelModal(false)}
              className="btn-secondary text-[11px] py-1 px-2.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!newTitle.trim()}
              onClick={handleSaveCustomTemplate}
              className="btn-primary text-[11px] py-1 px-3"
            >
              Salvar Modelo
            </button>
          </div>
        </div>
      )}

      {/* Caixa de Texto de Instruções com Ícone de Ajuda / Melhores Práticas */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Instruções, Persona e Regras da IA</label>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            title="Ver melhores práticas de estrutura e formatação de prompts"
          >
            <HelpCircle className="h-3.5 w-3.5 text-brand-600" />
            <span>Melhores Práticas & Estrutura</span>
          </button>
        </div>
        <textarea
          className="input min-h-48 text-xs font-mono leading-relaxed"
          value={data.systemPrompt}
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
          placeholder="Ex: 1. PAPEL E IDENTIDADE: Você é o assistente virtual do Carlos Silva Jr..."
        />
      </div>

      {/* Modal Educativo: Melhores Práticas para Criação de Instruções */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 p-4 sm:px-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-600" />
                  Melhores Práticas para Instruções da IA
                </h3>
                <p className="text-xs text-zinc-500">
                  Como estruturar seu prompt para respostas naturais, assertivas e de alta conversão no Direct.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="btn-ghost p-1.5 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-zinc-700">
              {/* Os 5 Pilares */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-1">
                  <span className="font-bold text-blue-900 block text-xs">1. Papel & Identidade</span>
                  <p className="text-[11px] text-blue-950/80 leading-relaxed">
                    Defina quem a IA é (ex: <em>&quot;Sofia, consultora especialista em vendas da empresa X&quot;</em>) e qual o tom de voz (amigável, consultivo, polido).
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-1">
                  <span className="font-bold text-emerald-900 block text-xs">2. Objetivo Principal</span>
                  <p className="text-[11px] text-emerald-950/80 leading-relaxed">
                    Especifique o resultado esperado: tirar dúvidas de preços, capturar telefone para o CRM ou enviar o link do Google Meet.
                  </p>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 space-y-1">
                  <span className="font-bold text-purple-900 block text-xs">3. Base de Conhecimento (RAG)</span>
                  <p className="text-[11px] text-purple-950/80 leading-relaxed">
                    Instrua a IA a consultar os documentos indexados no menu lateral e nunca inventar prazos, valores ou dados fora da base.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-1">
                  <span className="font-bold text-amber-900 block text-xs">4. Formato para Instagram / WhatsApp</span>
                  <p className="text-[11px] text-amber-950/80 leading-relaxed">
                    Exija parágrafos curtos (1 a 3 linhas), espaçados, linguagem humana e uso comedido de emojis (1 ou 2 por mensagem).
                  </p>
                </div>
              </div>

              {/* Regras e Limites */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5">
                <span className="font-bold text-zinc-900 block text-xs">5. Regras de Segurança & Transbordo Humano</span>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Defina o que a IA <strong>NÃO</strong> deve fazer: nunca prometer descontos sem autorização e, quando o cliente pedir para falar com um humano, transbordar educadamente com a frase de transbordo (ex: <em>&quot;Vou transferir seu atendimento para nossa equipe agora mesmo!&quot;</em>).
                </p>
              </div>

              {/* Card de Exemplo de Estrutura */}
              <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-900 text-xs">Modelo Estruturado Recomendado:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...data, systemPrompt: RECOMMENDED_STRUCTURE_BOILERPLATE });
                      setShowHelpModal(false);
                    }}
                    className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="h-3 w-3" />
                    Inserir Estrutura no Campo
                  </button>
                </div>
                <pre className="rounded-lg bg-white p-3 font-mono text-[11px] text-zinc-700 whitespace-pre-wrap border border-brand-100 leading-relaxed">
                  {RECOMMENDED_STRUCTURE_BOILERPLATE}
                </pre>
              </div>
            </div>

            <div className="border-t border-zinc-100 p-4 px-6 flex items-center justify-between bg-zinc-50/50">
              <span className="text-[11px] text-zinc-400">
                Você pode criar e salvar seus próprios modelos a qualquer momento no botão &quot;+ Novo Modelo&quot;.
              </span>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="btn-secondary text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
          <input
            type="checkbox"
            checked={data.conversational}
            onChange={(e) => onChange({ ...data, conversational: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-brand-600"
          />
          Modo Conversa Contínua (Responde várias perguntas seguidas no Direct)
        </label>

        {data.conversational && (
          <div>
            <label className="text-[11px] font-bold text-zinc-600 block mb-1">
              Máximo de turnos da conversa antes de seguir o fluxo
            </label>
            <input
              type="number"
              min={1}
              max={20}
              className="input text-xs w-32"
              value={data.maxTurns ?? 5}
              onChange={(e) => onChange({ ...data, maxTurns: Number(e.target.value) })}
            />
            <p className="mt-1 text-[10px] text-zinc-400">
              Após {data.maxTurns ?? 5} respostas, a IA pode transbordar para a equipe ou seguir o próximo bloco.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-zinc-100 p-2.5 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>Conectado à Base de Conhecimento RAG</span>
        <a href="/app/knowledge" target="_blank" className="font-semibold text-brand-600 hover:underline">
          Ver Documentos ↗
        </a>
      </div>
    </div>
  );
}
