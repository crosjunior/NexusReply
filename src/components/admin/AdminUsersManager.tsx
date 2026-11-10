"use client";

import { useState, useTransition } from "react";
import {
  ShieldCheck,
  Search,
  Lock,
  Unlock,
  Sparkles,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Workflow,
  MessageSquare,
  Users,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import {
  toggleUserBlockAction,
  toggleUserUnlimitedAction,
  extendUserTrialAction,
  getWorkspaceAuditDetailsAction,
} from "@/app/app/admin/actions";

export interface AdminUserRow {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  email: string;
  createdAt: string;
  trialEndsAt: string;
  daysLeft: number;
  isBlocked: boolean;
  isUnlimited: boolean;
  flowsLimit: number;
  igAccountsLimit: number;
  whatsappEnabled: boolean;
  subscriptionStatus: string;
  flowsCount: number;
  igAccountsCount: number;
  contactsCount: number;
  messagesCount: number;
}

export function AdminUsersManager({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "trial" | "unlimited" | "expired" | "blocked">("all");
  const [auditUser, setAuditUser] = useState<AdminUserRow | null>(null);
  const [auditDetails, setAuditDetails] = useState<{
    flows: Array<{ id: string; name: string; status: string; created_at: string; runs_count?: number }>;
    accounts: Array<{ id: string; username: string; name?: string; status: string }>;
    contacts: Array<{ id: string; username?: string; name?: string; created_at: string }>;
    recentMessages: Array<{ id: string; kind: string; text?: string; direction: string; source: string; created_at: string }>;
  } | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.workspaceName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "trial") return !u.isUnlimited && !u.isBlocked && u.daysLeft > 0;
    if (filter === "unlimited") return u.isUnlimited;
    if (filter === "expired") return !u.isUnlimited && !u.isBlocked && u.daysLeft <= 0;
    if (filter === "blocked") return u.isBlocked;
    return true;
  });

  const handleToggleBlock = (userRow: AdminUserRow) => {
    if (!confirm(`Deseja ${userRow.isBlocked ? "desbloquear" : "bloquear"} o usuário ${userRow.email}?`)) return;
    startTransition(async () => {
      try {
        const res = await toggleUserBlockAction(userRow.workspaceId, userRow.isBlocked);
        setUsers((prev) =>
          prev.map((u) =>
            u.workspaceId === userRow.workspaceId
              ? { ...u, isBlocked: res.blocked, subscriptionStatus: res.blocked ? "blocked" : "trial" }
              : u
          )
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao alterar bloqueio.");
      }
    });
  };

  const handleToggleUnlimited = (userRow: AdminUserRow) => {
    const actionName = userRow.isUnlimited ? "remover privilégios VIP/Ilimitado" : "conceder acesso VIP ILIMITADO";
    if (!confirm(`Deseja ${actionName} para ${userRow.email}?`)) return;
    startTransition(async () => {
      try {
        const res = await toggleUserUnlimitedAction(userRow.workspaceId, userRow.isUnlimited);
        setUsers((prev) =>
          prev.map((u) =>
            u.workspaceId === userRow.workspaceId
              ? {
                  ...u,
                  isUnlimited: res.unlimited,
                  whatsappEnabled: res.unlimited,
                  flowsLimit: res.unlimited ? 999999 : 1,
                  subscriptionStatus: res.unlimited ? "unlimited" : "trial",
                }
              : u
          )
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao alterar status de assinatura.");
      }
    });
  };

  const handleExtendTrial = (userRow: AdminUserRow, days: number) => {
    startTransition(async () => {
      try {
        const res = await extendUserTrialAction(userRow.workspaceId, days);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.workspaceId !== userRow.workspaceId) return u;
            const newDays = Math.max(0, Math.ceil((new Date(res.nextTrialEndsAt).getTime() - Date.now()) / 86400000));
            return {
              ...u,
              trialEndsAt: res.nextTrialEndsAt,
              daysLeft: newDays,
              isBlocked: false,
              subscriptionStatus: "trial",
            };
          })
        );
        alert(`Período de teste de ${userRow.email} prorrogado em +${days} dias com sucesso!`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao prorrogar teste.");
      }
    });
  };

  const openAudit = async (userRow: AdminUserRow) => {
    setAuditUser(userRow);
    setLoadingAudit(true);
    setAuditDetails(null);
    try {
      const details = await getWorkspaceAuditDetailsAction(userRow.workspaceId);
      setAuditDetails(details);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao carregar auditoria.");
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por e-mail ou nome da marca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-lg bg-zinc-100 p-1 text-xs">
          {(
            [
              { id: "all", label: `Todos (${users.length})` },
              { id: "trial", label: `Em Teste (${users.filter((u) => !u.isUnlimited && !u.isBlocked && u.daysLeft > 0).length})` },
              { id: "unlimited", label: `VIP Ilimitados (${users.filter((u) => u.isUnlimited).length})` },
              { id: "expired", label: `Expirados (${users.filter((u) => !u.isUnlimited && !u.isBlocked && u.daysLeft <= 0).length})` },
              { id: "blocked", label: `Bloqueados (${users.filter((u) => u.isBlocked).length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-all ${
                filter === tab.id
                  ? "bg-white text-brand-700 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Usuário / Workspace</th>
                <th className="px-4 py-3.5">Status & Vigência</th>
                <th className="px-4 py-3.5 text-center">Consumo & Ativos</th>
                <th className="px-4 py-3.5 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isCarlos = u.email.toLowerCase() === "carlos@conexaoagil.com.br";
                  return (
                    <tr key={u.workspaceId} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-sm">
                            {u.workspaceName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900 truncate">{u.workspaceName}</span>
                              {isCarlos && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  <ShieldCheck className="h-3 w-3 text-amber-600" /> Super Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono mt-0.5">{u.email}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              Cadastrado em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {u.isBlocked ? (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                            <XCircle className="h-3.5 w-3.5" /> Bloqueado
                          </div>
                        ) : u.isUnlimited ? (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> VIP Ilimitado
                          </div>
                        ) : u.daysLeft > 0 ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              <Clock className="h-3.5 w-3.5" /> {u.daysLeft} dias restantes
                            </span>
                            <div className="text-[11px] text-zinc-400 mt-1">
                              Expira em {new Date(u.trialEndsAt).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Teste Expirado
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-3 text-xs">
                          <div className="text-center" title="Fluxos criados / limite">
                            <span className="font-bold text-zinc-900 block">
                              {u.flowsCount} / {u.isUnlimited ? "∞" : u.flowsLimit}
                            </span>
                            <span className="text-[10px] text-zinc-400">Fluxos</span>
                          </div>
                          <div className="text-center" title="Contas de Instagram">
                            <span className="font-bold text-zinc-900 block">{u.igAccountsCount}</span>
                            <span className="text-[10px] text-zinc-400">Instagram</span>
                          </div>
                          <div className="text-center" title="Contatos capturados">
                            <span className="font-bold text-zinc-900 block">{u.contactsCount}</span>
                            <span className="text-[10px] text-zinc-400">Contatos</span>
                          </div>
                          <div className="text-center" title="Mensagens enviadas/recebidas">
                            <span className="font-bold text-zinc-900 block">{u.messagesCount}</span>
                            <span className="text-[10px] text-zinc-400">Mensagens</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Prorrogar Teste */}
                          {!u.isUnlimited && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleExtendTrial(u, 7)}
                                disabled={isPending}
                                className="rounded px-2 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                                title="Prorrogar teste em +7 dias"
                              >
                                +7d
                              </button>
                              <button
                                onClick={() => handleExtendTrial(u, 15)}
                                disabled={isPending}
                                className="rounded px-2 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                                title="Prorrogar teste em +15 dias"
                              >
                                +15d
                              </button>
                              <button
                                onClick={() => handleExtendTrial(u, 30)}
                                disabled={isPending}
                                className="rounded px-2 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                                title="Prorrogar teste em +30 dias"
                              >
                                +30d
                              </button>
                            </div>
                          )}

                          {/* Alternar VIP Ilimitado */}
                          {!isCarlos && (
                            <button
                              onClick={() => handleToggleUnlimited(u)}
                              disabled={isPending}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-1 transition-colors ${
                                u.isUnlimited
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                              }`}
                              title={u.isUnlimited ? "Remover status VIP" : "Liberar WhatsApp e fluxos ilimitados"}
                            >
                              <Sparkles className="h-3 w-3" />
                              {u.isUnlimited ? "VIP Ativo" : "Tornar VIP"}
                            </button>
                          )}

                          {/* Bloquear / Desbloquear */}
                          {!isCarlos && (
                            <button
                              onClick={() => handleToggleBlock(u)}
                              disabled={isPending}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.isBlocked
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                  : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100"
                              }`}
                              title={u.isBlocked ? "Desbloquear usuário" : "Bloquear usuário"}
                            >
                              {u.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>
                          )}

                          {/* Auditoria / Detalhes */}
                          <button
                            onClick={() => openAudit(u)}
                            className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100"
                            title="Ver o que este usuário fez na aplicação"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Auditoria e Atividades */}
      {auditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-brand-600" /> Auditoria de Atividades — {auditUser.workspaceName}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">{auditUser.email}</p>
              </div>
              <button
                onClick={() => setAuditUser(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAudit ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
                <p className="mt-3 text-sm">Carregando dados completos de uso…</p>
              </div>
            ) : auditDetails ? (
              <div className="mt-6 space-y-6">
                {/* Fluxos Criados */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-brand-600" /> Fluxos Criados ({auditDetails.flows.length})
                  </h4>
                  {auditDetails.flows.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500 italic">Nenhum fluxo criado até o momento.</p>
                  ) : (
                    <div className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                      {auditDetails.flows.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 text-xs">
                          <div>
                            <span className="font-semibold text-zinc-900">{f.name}</span>
                            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                              {f.status}
                            </span>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              Criado em {new Date(f.created_at).toLocaleString("pt-BR")}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-zinc-800">{f.runs_count ?? 0}</span>
                            <span className="text-[10px] text-zinc-400 block">execuções</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contas de Instagram Conectadas */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-pink-600" /> Contas de Instagram Conectadas ({auditDetails.accounts.length})
                  </h4>
                  {auditDetails.accounts.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500 italic">Nenhuma conta de Instagram conectada.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {auditDetails.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-zinc-900">@{acc.username}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {acc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Últimos Contatos Capturados */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" /> Últimos Contatos Capturados ({auditDetails.contacts.length})
                  </h4>
                  {auditDetails.contacts.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500 italic">Nenhum contato registrado ainda.</p>
                  ) : (
                    <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                      {auditDetails.contacts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 text-xs">
                          <span className="font-medium text-zinc-800">{c.name || `@${c.username}` || "Contato anônimo"}</span>
                          <span className="text-[11px] text-zinc-400">
                            {new Date(c.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Últimas Mensagens no Sistema */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" /> Últimas Mensagens Trocadas ({auditDetails.recentMessages.length})
                  </h4>
                  {auditDetails.recentMessages.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500 italic">Nenhuma mensagem registrada.</p>
                  ) : (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5">
                      {auditDetails.recentMessages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-md p-2 text-xs ${
                            m.direction === "out" ? "bg-brand-50 text-brand-900 ml-4" : "bg-white text-zinc-800 mr-4 border border-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                            <span>{m.direction === "out" ? `Bot (${m.source})` : "Usuário"}</span>
                            <span>{new Date(m.created_at).toLocaleTimeString("pt-BR")}</span>
                          </div>
                          <p className="truncate">{m.text || `[${m.kind}]`}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

