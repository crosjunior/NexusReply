"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Bot,
  Clock,
  GitBranch,
  ExternalLink,
  MessageSquare,
  PlayCircle,
  TextCursorInput,
  Zap,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import type {
  ActionData,
  AiData,
  ConditionData,
  DelayData,
  InputData,
  MessageData,
  NodeType,
  StartData,
} from "@/lib/engine/types";
import { COMPONENT_DETAILS } from "./component-info";
import { ConnectionHelper } from "./ConnectionHelper";

export const NODE_META: Record<NodeType, { label: string; icon: typeof Bot; color: string }> = {
  start: { label: "Início", icon: PlayCircle, color: "bg-emerald-500" },
  message: { label: "Mensagem", icon: MessageSquare, color: "bg-brand-600" },
  input: { label: "Pergunta", icon: TextCursorInput, color: "bg-sky-500" },
  condition: { label: "Condição", icon: GitBranch, color: "bg-amber-500" },
  action: { label: "Ação", icon: Zap, color: "bg-pink-500" },
  delay: { label: "Espera", icon: Clock, color: "bg-zinc-500" },
  ai: { label: "IA", icon: Bot, color: "bg-indigo-500" },
};

export const TRIGGER_LABEL: Record<string, string> = {
  comment_keyword: "Comentário com palavra-chave",
  dm_keyword: "DM com palavra-chave",
  story_reply: "Resposta ao story",
  story_mention: "Menção no story",
  default_reply: "Qualquer outra DM",
};

type Extra = { hasError?: boolean; label?: string };

function Shell({
  type,
  selected,
  hasError,
  children,
  target = true,
}: {
  type: NodeType;
  selected?: boolean;
  hasError?: boolean;
  children: React.ReactNode;
  target?: boolean;
}) {
  const meta = NODE_META[type];
  const details = COMPONENT_DETAILS[type];
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      className={`relative w-64 rounded-xl border bg-white text-left shadow-sm transition ${
        selected ? "border-brand-500 ring-2 ring-brand-200" : hasError ? "border-red-400" : "border-zinc-200"
      }`}
    >
      {target && <Handle type="target" position={Position.Left} className="!bg-zinc-400" />}

      {/* Header do Bloco */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md text-white ${meta.color}`}>
          <meta.icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold text-zinc-700">{meta.label}</span>

        {/* Ícone de Informação explicativo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(!showInfo);
          }}
          className={`ml-auto p-1 rounded-md transition-colors ${
            showInfo || selected
              ? "text-brand-600 bg-brand-50"
              : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          }`}
          title="Ver o objetivo, o que faz e exemplos deste componente"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
      </div>

      {/* Card Explicativo Flutuante do Componente */}
      {showInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-2 left-full ml-3 z-50 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl backdrop-blur-md text-xs animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`flex h-4 w-4 items-center justify-center rounded text-white text-[10px] ${meta.color}`}>
                <meta.icon className="h-2.5 w-2.5" />
              </span>
              <span className="font-bold text-zinc-900">{details.label}</span>
            </div>
            <button onClick={() => setShowInfo(false)} className="text-zinc-400 hover:text-zinc-700 p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-zinc-700">
            <div>
              <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider block">🎯 Objetivo:</span>
              <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">{details.objective}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider block">⚙️ O que ele faz:</span>
              <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">{details.whatItDoes}</p>
            </div>
            <div className="rounded bg-brand-50/70 p-2 border border-brand-100">
              <span className="text-[10px] font-bold text-brand-900 uppercase tracking-wider block">💡 Exemplo no contexto:</span>
              <p className="text-[11px] text-zinc-700 leading-snug mt-0.5 italic">&quot;{details.contextExample}&quot;</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5 p-3 text-xs text-zinc-600">{children}</div>
    </div>
  );
}

function Out({
  nodeId,
  sourceType,
  id,
  label,
  tone = "zinc",
}: {
  nodeId: string;
  sourceType: NodeType;
  id: string;
  label: string;
  tone?: "zinc" | "brand" | "green" | "red";
}) {
  const tones = {
    zinc: "bg-zinc-50 text-zinc-600 border-zinc-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`relative flex items-center justify-between rounded-md border px-2 py-1 text-[11px] group ${tones[tone]}`}>
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <ConnectionHelper
          nodeId={nodeId}
          handleId={id}
          handleLabel={label}
          sourceType={sourceType}
        />
        <Handle
          type="source"
          position={Position.Right}
          id={id}
          className="!bg-brand-500 !border-white !w-2.5 !h-2.5"
          style={{ right: -13 }}
        />
      </div>
    </div>
  );
}

function Preview({ text, empty }: { text?: string; empty: string }) {
  return text?.trim() ? (
    <p className="line-clamp-4 whitespace-pre-wrap text-zinc-700">{text}</p>
  ) : (
    <p className="italic text-zinc-400">{empty}</p>
  );
}

export function StartNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StartData & Extra;
  return (
    <Shell type="start" selected={selected} hasError={d.hasError} target={false}>
      {d.triggers.length === 0 && <p className="italic text-zinc-400">Clique para adicionar um gatilho</p>}
      {d.triggers.map((t) => (
        <div key={t.id} className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
          <div className="font-medium">{TRIGGER_LABEL[t.type]}</div>
          {t.match !== "any" && t.keywords.length > 0 && (
            <div className="truncate text-[11px] opacity-80">{t.keywords.join(", ")}</div>
          )}
        </div>
      ))}
      <Out nodeId={id} sourceType="start" id="next" label="Começar" tone="green" />
    </Shell>
  );
}

export function MessageNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MessageData & Extra;
  const waits = d.quickReplies.length > 0 || d.buttons.some((b) => b.type === "postback");
  return (
    <Shell type="message" selected={selected} hasError={d.hasError}>
      {d.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.imageUrl} alt="" className="h-24 w-full rounded-md object-cover" />
      )}
      <Preview text={d.text} empty="Escreva a mensagem…" />
      {d.buttons.map((b) =>
        b.type === "url" ? (
          <div key={b.id} className="flex items-center justify-between rounded-md border border-zinc-200 px-2 py-1 text-[11px]">
            {b.title || "Botão"} <ExternalLink className="h-3 w-3" />
          </div>
        ) : (
          <Out nodeId={id} sourceType="message" key={b.id} id={b.id} label={b.title || "Botão"} tone="brand" />
        ),
      )}
      {d.quickReplies.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">Respostas rápidas</div>
          {d.quickReplies.map((q) => (
            <Out nodeId={id} sourceType="message" key={q.id} id={q.id} label={q.title || "Opção"} />
          ))}
        </div>
      )}
      {!waits && <Out nodeId={id} sourceType="message" id="next" label="Próximo passo" />}
    </Shell>
  );
}

export function InputNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as InputData & Extra;
  return (
    <Shell type="input" selected={selected} hasError={d.hasError}>
      <Preview text={d.question} empty="Pergunta…" />
      <div className="text-[11px] text-zinc-500">
        Salva em <code className="rounded bg-zinc-100 px-1">{d.field || "?"}</code> · {d.validation}
      </div>
      <Out nodeId={id} sourceType="input" id="next" label="Respondeu" tone="green" />
      {d.skipLabel && <Out nodeId={id} sourceType="input" id="skip" label={`Pulou (${d.skipLabel})`} />}
    </Shell>
  );
}

const OP_LABEL: Record<string, string> = {
  has_tag: "tem a tag",
  not_has_tag: "não tem a tag",
  field_equals: "campo igual a",
  field_contains: "campo contém",
  field_exists: "campo preenchido",
};

export function ConditionNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ConditionData & Extra;
  const subject = d.op.includes("tag") ? d.tag : `${d.field ?? "?"}${d.op === "field_exists" ? "" : ` = ${d.value ?? ""}`}`;
  return (
    <Shell type="condition" selected={selected} hasError={d.hasError}>
      <p className="text-zinc-700">
        Se contato {OP_LABEL[d.op]} <b>{subject || "?"}</b>
      </p>
      <Out nodeId={id} sourceType="condition" id="true" label="Sim" tone="green" />
      <Out nodeId={id} sourceType="condition" id="false" label="Não" tone="red" />
    </Shell>
  );
}

const ACTION_LABEL: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  set_field: "Definir campo",
  handoff: "Transferir p/ humano",
  webhook: "Enviar webhook",
};

export function ActionNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ActionData & Extra;
  return (
    <Shell type="action" selected={selected} hasError={d.hasError}>
      {d.actions.length === 0 && <p className="italic text-zinc-400">Nenhuma ação</p>}
      {d.actions.map((a) => (
        <div key={a.id} className="truncate">
          • {ACTION_LABEL[a.kind]} {a.tag ?? a.field ?? (a.url ? new URL(a.url, "https://x").host : "")}
        </div>
      ))}
      <Out nodeId={id} sourceType="action" id="next" label="Próximo passo" />
    </Shell>
  );
}

export function DelayNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as DelayData & Extra;
  return (
    <Shell type="delay" selected={selected} hasError={d.hasError}>
      <p>
        Aguardar <b>{d.minutes}</b> min
      </p>
      <p className="text-[11px] text-zinc-400">Só envia se ainda estiver dentro da janela de 24h</p>
      <Out nodeId={id} sourceType="delay" id="next" label="Depois" />
    </Shell>
  );
}

export function AiNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as AiData & Extra;
  return (
    <Shell type="ai" selected={selected} hasError={d.hasError}>
      <Preview text={d.systemPrompt} empty="Instruções da IA…" />
      <p className="text-[11px] text-zinc-500">{d.conversational ? `Conversa até ${d.maxTurns} turnos` : "Uma resposta"}</p>
      <Out nodeId={id} sourceType="ai" id="next" label="Depois" />
    </Shell>
  );
}

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  input: InputNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  ai: AiNode,
};
