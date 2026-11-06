"use client";

import { Plus, Trash2, X } from "lucide-react";
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
  TriggerConfig,
  TriggerType,
} from "@/lib/engine/types";
import { NODE_META, TRIGGER_LABEL } from "./nodes";

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
      },
    ]);

  return (
    <>
      <p className="text-xs text-zinc-500">O fluxo começa quando qualquer um destes gatilhos acontecer.</p>
      {data.triggers.map((t, i) => (
        <div key={t.id} className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{TRIGGER_LABEL[t.type]}</span>
            <button className="text-zinc-400 hover:text-red-600" onClick={() => set(data.triggers.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {t.type !== "default_reply" && t.type !== "story_mention" && (
            <>
              <div>
                <label className="label">Quando a mensagem</label>
                <select className="input" value={t.match} onChange={(e) => upd(i, { match: e.target.value as TriggerConfig["match"] })}>
                  <option value="contains">contém a palavra</option>
                  <option value="exact">é exatamente</option>
                  <option value="any">qualquer texto</option>
                </select>
              </div>
              {t.match !== "any" && (
                <div>
                  <label className="label">Palavras-chave (separe por vírgula)</label>
                  <input
                    className="input"
                    defaultValue={t.keywords.join(", ")}
                    onBlur={(e) => upd(i, { keywords: list(e.target.value) })}
                    placeholder="EU QUERO, LINK, PREÇO"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">Ignora maiúsculas e acentos.</p>
                </div>
              )}
            </>
          )}
          {t.type === "comment_keyword" && (
            <>
              <div>
                <label className="label">Respostas públicas no comentário (uma por linha, sorteada)</label>
                <textarea
                  className="input min-h-20"
                  defaultValue={(t.publicReplies ?? []).join("\n")}
                  onBlur={(e) => upd(i, { publicReplies: lines(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Apenas nos posts (IDs de mídia, opcional)</label>
                <input
                  className="input"
                  defaultValue={(t.mediaIds ?? []).join(", ")}
                  onBlur={(e) => upd(i, { mediaIds: list(e.target.value) })}
                  placeholder="Vazio = todos os posts e reels"
                />
              </div>
            </>
          )}
          {t.type === "default_reply" && (
            <div>
              <label className="label">Não repetir para o mesmo contato por (horas)</label>
              <input
                type="number"
                min={0}
                className="input"
                value={t.cooldownHours ?? 12}
                onChange={(e) => upd(i, { cooldownHours: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      ))}
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(TRIGGER_LABEL) as TriggerType[]).map((k) => (
          <button key={k} className="btn-secondary justify-start" onClick={() => add(k)}>
            <Plus className="h-4 w-4" /> {TRIGGER_LABEL[k]}
          </button>
        ))}
      </div>
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
function AiEditor({ data, onChange }: EP<AiData>) {
  return (
    <>
      <div>
        <label className="label">Instruções e conhecimento da IA</label>
        <textarea
          className="input min-h-48"
          value={data.systemPrompt}
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
          placeholder="Persona, tom de voz, preços, horários, links, perguntas frequentes…"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.conversational} onChange={(e) => onChange({ ...data, conversational: e.target.checked })} />
        Modo conversa (responde várias mensagens seguidas)
      </label>
      {data.conversational && (
        <div>
          <label className="label">Máximo de turnos antes de seguir</label>
          <input type="number" min={1} max={20} className="input" value={data.maxTurns} onChange={(e) => onChange({ ...data, maxTurns: Number(e.target.value) })} />
        </div>
      )}
      <p className="text-[11px] text-zinc-400">Usa OPENAI_API_KEY (ou qualquer API compatível) configurada no servidor.</p>
    </>
  );
}
