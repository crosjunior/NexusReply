"use client";

import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { AlertTriangle, ArrowLeft, FlaskConical, Rocket, Sliders, Smartphone } from "lucide-react";
import { makeNode, uid } from "@/lib/flow-templates";
import { validateGraph } from "@/lib/engine/validate";
import type { FlowGraph, FlowNode, NodeType } from "@/lib/engine/types";
import { publishFlow, saveFlow } from "@/app/app/actions";
import { NODE_META, nodeTypes } from "./nodes";
import { COMPONENT_DETAILS } from "./component-info";
import { NodeEditor } from "./NodeEditor";
import { Simulator } from "./Simulator";
import { ComponentGuide } from "./ComponentGuide";
import { QuickFlowForm, type KnowledgeBaseOption, type IgAccountInfo } from "./QuickFlowForm";

interface Props {
  flow: { id: string; name: string; status: string; graph: FlowGraph };
  knowledgeBases?: KnowledgeBaseOption[];
  igAccount?: IgAccountInfo | null;
}

const PALETTE: NodeType[] = ["message", "input", "condition", "action", "delay", "ai"];

function toRF(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((n) => ({ ...n, data: n.data as unknown as Record<string, unknown>, deletable: n.type !== "start" })),
    edges: graph.edges.map((e) => ({ ...e, type: "smoothstep", animated: false })),
  };
}

function fromRF(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hasError, ...data } = n.data as Record<string, unknown>;
      return { id: n.id, type: n.type as NodeType, position: n.position, data } as unknown as FlowNode;
    }),
    edges: edges.map((e) => ({ id: e.id, source: e.source, sourceHandle: e.sourceHandle ?? "next", target: e.target })),
  };
}

function Builder({ flow, knowledgeBases = [], igAccount }: Props) {
  const initial = useMemo(() => toRF(flow.graph), [flow.graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [name, setName] = useState(flow.name);
  const [status, setStatus] = useState(flow.status);
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "edit" | "test" | "issues">("none");
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [publishing, startPublish] = useTransition();
  const [viewMode, setViewMode] = useState<"form" | "visual">("form");
  const rf = useReactFlow();
  const first = useRef(true);

  const graph = useMemo(() => fromRF(nodes, edges), [nodes, edges]);
  // chave estável: seleção/hover não disparam autosave
  const graphKey = useMemo(() => JSON.stringify(graph), [graph]);
  const issues = useMemo(() => validateGraph(graph), [graph]);
  const errorNodes = useMemo(() => new Set(issues.filter((i) => i.level === "error" && i.nodeId).map((i) => i.nodeId!)), [issues]);

  // marca nós com erro (visual)
  const displayNodes = useMemo(
    () => nodes.map((n) => (errorNodes.has(n.id) ? { ...n, data: { ...n.data, hasError: true } } : n)),
    [nodes, errorNodes],
  );

  // autosave com debounce
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(async () => {
      setSaveState("saving");
      const r = await saveFlow(flow.id, JSON.parse(graphKey) as FlowGraph, name);
      setSaveState(r.ok ? "saved" : "error");
    }, 1500);
    return () => clearTimeout(t);
  }, [graphKey, name, flow.id]);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const targetInDegree = edges.filter((e) => e.target === conn.target).length;
      if (targetInDegree >= 1) {
        setToast({ ok: false, text: "Cada bloco pode receber apenas 1 conexão de entrada." });
        return;
      }
      setEdges((eds) => addEdge({ ...conn, id: uid(), type: "smoothstep" }, eds));
    },
    [edges, setEdges],
  );

  function addBlock(type: NodeType) {
    const fresh = makeNode(type, { x: 0, y: 0 });
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    fresh.position = { x: Math.round(center.x - 128), y: Math.round(center.y - 60) };
    const rfNode: Node = { id: fresh.id, type: fresh.type, position: fresh.position, data: fresh.data as unknown as Record<string, unknown> };
    setNodes((ns) => [...ns, rfNode]);
    setSelected(fresh.id);
    setPanel("edit");
  }

  const selectedNode = graph.nodes.find((n) => n.id === selected);

  function updateNode(data: FlowNode["data"], removedHandles?: string[]) {
    setNodes((ns) => ns.map((n) => (n.id === selected ? { ...n, data: data as unknown as Record<string, unknown> } : n)));
    if (removedHandles?.length) {
      setEdges((eds) => eds.filter((e) => !(e.source === selected && removedHandles.includes(e.sourceHandle ?? "next"))));
    }
  }

  function deleteSelected() {
    if (!selected) return;
    setNodes((ns) => ns.filter((n) => n.id !== selected));
    setEdges((eds) => eds.filter((e) => e.source !== selected && e.target !== selected));
    setSelected(null);
    setPanel("none");
  }

  function publish() {
    startPublish(async () => {
      const r = await publishFlow(flow.id, graph, name);
      if (r.ok) {
        setStatus("published");
        setSaveState("saved");
        setToast({ ok: true, text: "Fluxo publicado! Já está respondendo no Instagram." });
      } else {
        setToast({ ok: false, text: r.error ?? "Erro ao publicar" });
        setPanel("issues");
      }
    });
  }

  // Sincronização e salvamento disparado pelo Modo Formulário Rápido
  async function handleFormSaveGraph(newGraph: FlowGraph, newName?: string) {
    if (newName) setName(newName);
    const rfData = toRF(newGraph);
    setNodes(rfData.nodes);
    setEdges(rfData.edges);
    setSaveState("saving");
    const r = await saveFlow(flow.id, newGraph, newName || name);
    setSaveState(r.ok ? "saved" : "error");
    if (r.ok) {
      setToast({ ok: true, text: "Fluxo salvo com sucesso!" });
    } else {
      setToast({ ok: false, text: r.error ?? "Erro ao salvar" });
    }
  }

  async function handleFormPublish() {
    publish();
  }

  // Se o usuário estiver no Modo Formulário Rápido, exibe a interface com mockup de celular
  if (viewMode === "form") {
    return (
      <QuickFlowForm
        flow={{ id: flow.id, name, status, graph }}
        knowledgeBases={knowledgeBases}
        igAccount={igAccount}
        onSaveGraph={handleFormSaveGraph}
        onPublish={handleFormPublish}
        onSwitchToVisual={() => setViewMode("visual")}
        isSaving={saveState === "saving"}
      />
    );
  }

  const errors = issues.filter((i) => i.level === "error").length;
  const saveLabel = { saved: "Salvo", dirty: "Alterações…", saving: "Salvando…", error: "Erro ao salvar" }[saveState];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <Link href="/app/flows" className="btn-ghost px-2" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-md px-2 py-1 font-medium outline-none hover:bg-zinc-100 focus:bg-zinc-100"
        />

        {/* Botão de alternar para o Modo Formulário Rápido */}
        <button
          type="button"
          onClick={() => setViewMode("form")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/70 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition shadow-sm"
          title="Alternar para o modo de formulário guiado com simulação de smartphone"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Modo Formulário Rápido</span>
        </button>

        <span className={`hidden text-xs sm:inline ${saveState === "error" ? "text-red-600" : "text-zinc-400"}`}>{saveLabel}</span>
        <span
          className={`hidden rounded-full px-2 py-0.5 text-xs sm:inline ${
            status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {status === "published" ? "Ativo" : status === "paused" ? "Pausado" : "Rascunho"}
        </span>
        <button className="btn-ghost relative px-2" onClick={() => setPanel(panel === "issues" ? "none" : "issues")} title="Validação">
          <AlertTriangle className={`h-4 w-4 ${errors ? "text-red-500" : issues.length ? "text-amber-500" : "text-zinc-400"}`} />
          {issues.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 px-1 text-[10px] text-white">{issues.length}</span>
          )}
        </button>
        <button className="btn-secondary" onClick={() => setPanel(panel === "test" ? "none" : "test")}>
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Testar</span>
        </button>
        <button className="btn-primary" onClick={publish} disabled={publishing}>
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">{publishing ? "Publicando…" : status === "published" ? "Atualizar" : "Publicar"}</span>
        </button>
      </header>

      {/* Palette */}
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2">
        {PALETTE.map((t) => {
          const m = NODE_META[t];
          const det = COMPONENT_DETAILS[t];
          return (
            <button
              key={t}
              className="btn-secondary shrink-0 py-1.5 text-xs group relative hover:border-brand-300"
              onClick={() => addBlock(t)}
              title={`${m.label}: ${det?.objective || ""}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded text-white ${m.color}`}>
                <m.icon className="h-3 w-3" />
              </span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => {
              setSelected(n.id);
              setPanel("edit");
            }}
            onPaneClick={() => {
              setSelected(null);
              if (panel === "edit") setPanel("none");
            }}
            onNodesDelete={() => {
              setSelected(null);
              setPanel("none");
            }}
            fitView
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap className="!bottom-4 !right-4 !bg-white/80" nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>

          {/* Dica / Guia Flutuante no Rodapé do Canvas */}
          <ComponentGuide nodes={displayNodes} />
        </div>

        {panel !== "none" && (
          <aside className="w-96 border-l border-zinc-200 bg-white">
            {panel === "edit" && selectedNode && (
              <NodeEditor
                key={selectedNode.id}
                node={selectedNode}
                onChange={updateNode}
                onDelete={deleteSelected}
                onClose={() => setPanel("none")}
              />
            )}
            {panel === "test" && <Simulator graph={graph} onClose={() => setPanel("none")} />}
            {panel === "issues" && (
              <div className="flex h-full flex-col">
                <div className="flex items-center border-b border-zinc-200 px-4 py-3">
                  <span className="font-medium">Validação</span>
                  <button className="btn-ghost ml-auto px-2 text-xs" onClick={() => setPanel("none")}>Fechar</button>
                </div>
                <ul className="flex-1 space-y-2 overflow-y-auto p-4">
                  {issues.length === 0 && <li className="text-sm text-emerald-700">Tudo certo para publicar ✓</li>}
                  {issues.map((i, k) => (
                    <li key={k}>
                      <button
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${i.level === "error" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
                        onClick={() => {
                          if (!i.nodeId) return;
                          setSelected(i.nodeId);
                          setPanel("edit");
                          const n = nodes.find((x) => x.id === i.nodeId);
                          if (n) rf.setCenter(n.position.x + 128, n.position.y + 60, { zoom: 1, duration: 300 });
                        }}
                      >
                        {i.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}

        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ${
              toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

export function FlowBuilder(props: Props) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}
