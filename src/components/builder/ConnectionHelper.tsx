"use client";

import { useState, useRef, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Plus,
  HelpCircle,
  MessageSquare,
  TextCursorInput,
  GitBranch,
  Zap,
  Clock,
  Bot,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import { makeNode, uid } from "@/lib/flow-templates";
import type { NodeType } from "@/lib/engine/types";
import { COMPONENT_DETAILS, type ComponentDetails } from "./component-info";

interface ConnectionHelperProps {
  nodeId: string;
  handleId: string;
  handleLabel: string;
  sourceType: NodeType;
}

const AVAILABLE_COMPONENTS: NodeType[] = [
  "message",
  "input",
  "condition",
  "action",
  "delay",
  "ai",
];

export function ConnectionHelper({
  nodeId,
  handleId,
  handleLabel,
  sourceType,
}: ConnectionHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeInfo, setActiveInfo] = useState<ComponentDetails | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveInfo(null);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleSelectComponent(type: NodeType) {
    const currentNode = rf.getNode(nodeId);
    if (!currentNode) return;

    // Calcula posição inteligente à direita do nó atual
    const existingEdges = rf.getEdges().filter(
      (e) => e.source === nodeId && (e.sourceHandle ?? "next") === handleId
    );
    const verticalOffset = existingEdges.length * 90;

    const newPosition = {
      x: currentNode.position.x + 290,
      y: currentNode.position.y + verticalOffset,
    };

    const newNode = makeNode(type, newPosition);

    // 1. Adiciona novo nó
    rf.setNodes((nodes) => [
      ...nodes,
      { ...newNode, data: newNode.data as unknown as Record<string, unknown> },
    ]);

    // 2. Conecta a aresta do ponto atual ao novo nó
    const newEdge = {
      id: uid("e"),
      source: nodeId,
      sourceHandle: handleId,
      target: newNode.id,
      type: "smoothstep",
    };

    rf.setEdges((edges) => [
      ...edges.filter(
        (e) => !(e.source === nodeId && (e.sourceHandle ?? "next") === handleId)
      ),
      newEdge,
    ]);

    setIsOpen(false);
    setActiveInfo(null);
  }

  const currentSourceInfo = COMPONENT_DETAILS[sourceType];

  return (
    <div className="relative inline-block ml-1" ref={menuRef}>
      {/* Botão de Conectar Próximo Passo */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-600 hover:text-white transition-all shadow-sm group-hover:scale-110"
        title={`Conectar próximo passo a partir de: "${handleLabel}"`}
      >
        <Plus className="h-2.5 w-2.5 stroke-[3]" />
      </button>

      {/* Menu Popover Flutuante */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 cursor-default text-left"
          style={{ maxHeight: "460px" }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                Próximo Passo do Fluxo
              </span>
              <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                Conectar após &quot;{handleLabel}&quot;
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-700 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 mb-2 leading-tight">
            Passe o mouse para ver a explicação e clique para conectar ao fluxo:
          </p>

          {/* Lista de Componentes Disponíveis */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            {AVAILABLE_COMPONENTS.map((type) => {
              const details = COMPONENT_DETAILS[type];
              const Icon = details.icon;
              const isRecommended = currentSourceInfo?.suggestedNext?.includes(type);
              const isHovered = activeInfo?.type === type;

              return (
                <div
                  key={type}
                  className="relative group/item"
                  onMouseEnter={() => setActiveInfo(details)}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectComponent(type)}
                    className={`w-full flex items-center justify-between gap-1.5 p-2 rounded-lg border text-left transition-all ${
                      isHovered
                        ? "border-brand-500 bg-brand-50/70 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-white ${details.color}`}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-semibold text-zinc-800 truncate">
                        {details.label.split(" ")[0]}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveInfo(details);
                      }}
                      className="text-zinc-400 hover:text-brand-600 p-0.5"
                      title="Ver o que este componente faz"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Painel de Informação Explicativo (Objetivo, O que faz, Exemplo Contextual) */}
          {activeInfo ? (
            <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-2.5 text-zinc-800 space-y-2 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded text-white text-[10px] ${activeInfo.color}`}
                  >
                    <activeInfo.icon className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-xs font-bold text-zinc-900">
                    {activeInfo.label}
                  </span>
                </div>
                <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-brand-700 border border-brand-200">
                  {activeInfo.badge}
                </span>
              </div>

              {/* Objetivo */}
              <div>
                <span className="text-[10px] font-bold text-zinc-700 block uppercase tracking-wider">
                  🎯 Objetivo:
                </span>
                <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
                  {activeInfo.objective}
                </p>
              </div>

              {/* O que ele faz */}
              <div>
                <span className="text-[10px] font-bold text-zinc-700 block uppercase tracking-wider">
                  ⚙️ O que ele faz:
                </span>
                <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
                  {activeInfo.whatItDoes}
                </p>
              </div>

              {/* Exemplo dentro do contexto */}
              <div className="rounded bg-white/80 p-2 border border-brand-100">
                <span className="text-[10px] font-bold text-brand-900 block uppercase tracking-wider">
                  💡 Exemplo no contexto:
                </span>
                <p className="text-[11px] text-zinc-700 leading-snug mt-0.5 italic">
                  &quot;{activeInfo.contextExample}&quot;
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSelectComponent(activeInfo.type)}
                className="w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1.5"
              >
                + Adicionar e Conectar <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-2 text-center text-[11px] text-zinc-400">
              Passe o mouse sobre um componente acima para ver seu objetivo, o que ele faz e exemplos reais.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

