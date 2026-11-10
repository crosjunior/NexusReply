"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  X,
  MessageCircle,
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { getFlowMetricsAction } from "@/app/app/actions";

interface Props {
  flowId: string;
  flowName: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface MetricExecutionItem {
  id: string;
  username: string;
  name: string;
  profilePic?: string;
  isFollower: boolean;
  commentText?: string;
  responseText?: string;
  createdAt: string;
  status: "done" | "waiting" | "running";
}

export interface FlowMetricsData {
  totalComments: number;
  totalReplies: number;
  uniqueUsers: number;
  responseRate: number;
  followersCount: number;
  nonFollowersCount: number;
  executions: MetricExecutionItem[];
}

export function FlowMetricsModal({ flowId, flowName, isOpen, onClose }: Props) {
  const [data, setData] = useState<FlowMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await getFlowMetricsAction(flowId);
      if (res.ok && res.metrics) {
        setData(res.metrics);
      }
    } catch (err) {
      console.error("Falha ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    }
  }, [isOpen, flowId]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 sm:px-6 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Indicadores de Execução: {flowName}
              </h3>
              <p className="text-xs text-zinc-500">
                Métricas em tempo real de comentários, respostas e engajamento dos usuários.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
              title="Recarregar indicadores"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 text-zinc-400 hover:text-zinc-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
              <p className="text-xs text-zinc-500">Calculando indicadores e histórico de interações...</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-sm text-zinc-500">
              Não foi possível carregar os indicadores deste fluxo.
            </div>
          ) : (
            <>
              {/* Cards de Métricas Consolidadas */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="card p-4 space-y-1 bg-gradient-to-br from-white to-zinc-50/50">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-xs font-medium">Total Comentários</span>
                    <MessageCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">{data.totalComments}</div>
                  <p className="text-[10px] text-zinc-400">Gatilhos acionados</p>
                </div>

                <div className="card p-4 space-y-1 bg-gradient-to-br from-white to-zinc-50/50">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-xs font-medium">Respostas Enviadas</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">{data.totalReplies}</div>
                  <p className="text-[10px] text-zinc-400">Entregues no Direct</p>
                </div>

                <div className="card p-4 space-y-1 bg-gradient-to-br from-white to-zinc-50/50">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-xs font-medium">Usuários Únicos</span>
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">{data.uniqueUsers}</div>
                  <p className="text-[10px] text-zinc-400">Leads engajados</p>
                </div>

                <div className="card p-4 space-y-1 bg-gradient-to-br from-white to-zinc-50/50">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-xs font-medium">Taxa de Resposta</span>
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-zinc-900">{data.responseRate}%</div>
                  <p className="text-[10px] text-zinc-400">Eficiência de entrega</p>
                </div>
              </div>

              {/* Proporção de Seguidores vs Não Seguidores */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Distribuição do Público Engajado:</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <UserCheck className="h-4 w-4 text-emerald-600" /> {data.followersCount} Seguidores
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-600">
                    <UserX className="h-4 w-4 text-zinc-400" /> {data.nonFollowersCount} Novos visitantes
                  </span>
                </div>
              </div>

              {/* Tabela Detalhada com Nome, Usuário, Data/Hora, Seguidor e Comentário */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-900">Histórico de Pessoas que Comentaram</h4>
                {data.executions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                    Nenhum comentário ou interação registrada para este fluxo até o momento.
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/80 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="p-3">Usuário</th>
                            <th className="p-3">Vínculo</th>
                            <th className="p-3">Data e Hora</th>
                            <th className="p-3">Comentário do Lead</th>
                            <th className="p-3">Resposta Enviada</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-zinc-700">
                          {data.executions.map((item) => (
                            <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                              {/* Usuário (@ e Nome) */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {item.profilePic ? (
                                    <img
                                      src={item.profilePic}
                                      alt={item.username}
                                      className="h-7 w-7 rounded-full object-cover border border-zinc-200"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                                      {item.username.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-bold text-zinc-900 block leading-tight">
                                      @{item.username}
                                    </span>
                                    {item.name && item.name !== item.username && (
                                      <span className="text-[10px] text-zinc-400">{item.name}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Seguidor ou Não */}
                              <td className="p-3">
                                {item.isFollower ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <UserCheck className="h-3 w-3 text-emerald-600" /> Seguidor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                                    Não seguidor
                                  </span>
                                )}
                              </td>

                              {/* Data e Hora */}
                              <td className="p-3 whitespace-nowrap text-zinc-500 font-mono text-[11px]">
                                {formatDate(item.createdAt)}
                              </td>

                              {/* Comentário */}
                              <td className="p-3 max-w-xs">
                                <span className="rounded bg-zinc-100 px-2 py-1 text-zinc-800 font-medium inline-block">
                                  &quot;{item.commentText || "quero"}&quot;
                                </span>
                              </td>

                              {/* Resposta */}
                              <td className="p-3 max-w-xs truncate text-zinc-600" title={item.responseText}>
                                {item.responseText || "Enviado no direct via fluxo"}
                              </td>

                              {/* Status */}
                              <td className="p-3 text-right">
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  ● Concluído
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-zinc-100 p-4 px-6 flex items-center justify-between bg-zinc-50/50">
          <span className="text-xs text-zinc-500">
            Atualização contínua com base nos webhooks recebidos da Meta.
          </span>
          <button onClick={onClose} className="btn-primary text-xs">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

