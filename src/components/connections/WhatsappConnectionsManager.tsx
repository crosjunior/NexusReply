"use client";

import { useState, useEffect, useTransition } from "react";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Power,
  Trash2,
  Plus,
  MessageSquare,
  Users,
  Copy,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { EvolutionInstance } from "@/lib/whatsapp/evolution";
import {
  fetchWhatsappInstances,
  createWhatsappInstanceAction,
  getWhatsappQrCodeAction,
  getWhatsappPairingCodeAction,
  disconnectWhatsappAction,
  deleteWhatsappAction,
} from "@/app/app/connections/whatsapp-actions";

export function WhatsappConnectionsManager({
  initialInstances,
  whatsappEnabled = true,
}: {
  initialInstances: EvolutionInstance[];
  whatsappEnabled?: boolean;
}) {
  const [instances, setInstances] = useState<EvolutionInstance[]>(initialInstances);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [pairMode, setPairMode] = useState<"qr" | "code">("qr");
  const [phoneToPair, setPhoneToPair] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [activeInstance, setActiveInstance] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reloadInstances = async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsappInstances();
      setInstances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConnect = async (instanceName: string) => {
    setActiveInstance(instanceName);
    setModalOpen(true);
    setPairingCode(null);
    setQrCodeData(null);
    setStatusMsg("Carregando QR Code de pareamento...");

    const res = await getWhatsappQrCodeAction(instanceName);
    if (res.ok && res.data) {
      if (res.data.base64) {
        setQrCodeData(res.data.base64);
        setStatusMsg(null);
      } else if (res.data.code) {
        setQrCodeData(res.data.code);
        setStatusMsg(null);
      }
    } else {
      setStatusMsg(res.error || "Aguardando geração do QR code...");
    }
  };

  const handleCreateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName.trim()) return;
    setStatusMsg("Criando instância...");
    const res = await createWhatsappInstanceAction(newInstanceName.trim());
    if (res.ok) {
      await reloadInstances();
      await handleStartConnect(newInstanceName.trim());
      setNewInstanceName("");
    } else {
      alert(res.error || "Falha ao criar instância");
      setStatusMsg(null);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!activeInstance || !phoneToPair.trim()) return;
    setStatusMsg("Gerando código de 8 dígitos...");
    const res = await getWhatsappPairingCodeAction(activeInstance, phoneToPair);
    if (res.ok && res.code) {
      setPairingCode(res.code);
      setStatusMsg(null);
    } else {
      setStatusMsg(res.error || "Não foi possível gerar código.");
    }
  };

  const handleDisconnect = async (name: string) => {
    if (!confirm(`Desconectar ${name}?`)) return;
    startTransition(async () => {
      await disconnectWhatsappAction(name);
      await reloadInstances();
    });
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Excluir permanentemente a instância ${name}?`)) return;
    startTransition(async () => {
      await deleteWhatsappAction(name);
      await reloadInstances();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            Instâncias de WhatsApp (NexusCRM / Evolution)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Conecte seu WhatsApp instantaneamente lendo o QR Code ou digitando o código de 8 dígitos no celular.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadInstances}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Atualizar status das instâncias"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Aviso para usuários sem WhatsApp liberado */}
      {!whatsappEnabled && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-950">Conexão com WhatsApp — Exclusivo para Assinantes VIP</h3>
              <p className="mt-1 text-sm text-amber-800">
                Durante o teste gratuito de 20 dias, você pode explorar automações no Instagram. Para habilitar conexões de WhatsApp via QR Code ou API Oficial, solicite a ativação com o administrador.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="mailto:carlos@conexaoagil.com.br?subject=Upgrade%20NexusReply%20-%20Liberar%20WhatsApp"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
                >
                  Falar com o Administrador (carlos@conexaoagil.com.br)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de instâncias conectadas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {instances.map((inst) => {
          const isConnected = inst.connectionStatus === "open";
          const formattedPhone = inst.ownerJid
            ? inst.ownerJid.replace("@s.whatsapp.net", "").replace(/^55/, "+55 ")
            : "Número não identificado";

          return (
            <div
              key={inst.id || inst.name}
              className={`card p-5 space-y-4 border-2 transition-all ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-50/10"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {inst.profilePicUrl ? (
                    <img
                      src={inst.profilePicUrl}
                      alt={inst.profileName || inst.name}
                      className="h-12 w-12 rounded-full object-cover border border-emerald-300"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-base">
                      WA
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                      {inst.profileName || inst.name}
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Conectado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Desconectado
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{formattedPhone}</p>
                    <p className="text-[11px] text-zinc-400">Instância: {inst.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!isConnected ? (
                    <button
                      onClick={() => handleStartConnect(inst.name)}
                      className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" /> Conectar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(inst.name)}
                      disabled={isPending}
                      className="btn-secondary text-xs py-1 px-2.5 text-zinc-600 hover:text-red-600"
                      title="Desconectar do WhatsApp"
                    >
                      <Power className="h-3.5 w-3.5 mr-1" /> Desconectar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(inst.name)}
                    disabled={isPending}
                    className="btn-ghost text-red-500 hover:text-red-700 p-1.5"
                    title="Excluir instância"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Estatísticas da instância */}
              {inst._count && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 text-center text-xs">
                  <div className="rounded-lg bg-zinc-50 p-2">
                    <span className="block font-bold text-zinc-800">
                      {inst._count.Message?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">Mensagens</span>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2">
                    <span className="block font-bold text-zinc-800">
                      {inst._count.Chat?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">Conversas</span>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-2">
                    <span className="block font-bold text-zinc-800">
                      {inst._count.Contact?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[10px] text-zinc-500">Contatos</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Card para Criar Nova Instância */}
        <div className="card p-5 border-dashed border-2 border-zinc-200 flex flex-col justify-center items-center text-center space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-zinc-900">Adicionar Outro Número</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-0.5">
              Crie uma nova sessão para conectar outro WhatsApp de vendas ou atendimento.
            </p>
          </div>
          <form onSubmit={handleCreateAndConnect} className="w-full max-w-xs flex gap-2">
            <input
              type="text"
              required
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              placeholder="Ex: Suporte_Carlos"
              className="input text-xs flex-1"
            />
            <button type="submit" className="btn-primary text-xs whitespace-nowrap">
              Criar & Conectar
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Conexão com QR Code e Código de 8 dígitos (Igual NexusCRM) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Conectar WhatsApp: {activeInstance}
                </h3>
                <p className="text-xs text-zinc-500">
                  Abra o WhatsApp no seu celular ➔ Aparelhos conectados ➔ Conectar um aparelho
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  reloadInstances();
                }}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Alternância de Modo (QR Code vs Código de Pareamento) */}
            <div className="flex rounded-lg bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setPairMode("qr")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  pairMode === "qr"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Escanear QR Code
              </button>
              <button
                type="button"
                onClick={() => setPairMode("code")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                  pairMode === "code"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Conectar por Código (8 dígitos)
              </button>
            </div>

            {/* Conteúdo do Modo QR Code */}
            {pairMode === "qr" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-2">
                {qrCodeData ? (
                  <div className="rounded-xl border-4 border-emerald-500/20 p-2 bg-white shadow-inner">
                    <img
                      src={
                        qrCodeData.startsWith("data:")
                          ? qrCodeData
                          : `data:image/png;base64,${qrCodeData}`
                      }
                      alt="QR Code WhatsApp"
                      className="h-56 w-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
                    <span className="text-xs text-zinc-500">
                      {statusMsg || "Aguardando QR Code..."}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-zinc-500 text-center max-w-xs">
                  Aponte a câmera do WhatsApp para este código. A tela reconhecerá a conexão automaticamente.
                </p>
              </div>
            )}

            {/* Conteúdo do Modo Código de Pareamento */}
            {pairMode === "code" && (
              <div className="space-y-4 py-2">
                <div>
                  <label className="label">Número de Telefone com DDD (Ex: 5531999999999)</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneToPair}
                      onChange={(e) => setPhoneToPair(e.target.value)}
                      placeholder="5531999999999"
                      className="input text-xs flex-1"
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      className="btn-primary text-xs whitespace-nowrap bg-emerald-600 hover:bg-emerald-700"
                    >
                      Gerar Código
                    </button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                    <span className="text-xs text-emerald-800 font-medium">
                      Digite este código no seu WhatsApp:
                    </span>
                    <div className="text-2xl font-mono font-bold tracking-widest text-emerald-950">
                      {pairingCode}
                    </div>
                    <p className="text-[10px] text-emerald-700">
                      No WhatsApp, selecione &quot;Conectar com número de telefone&quot; e digite o código acima.
                    </p>
                  </div>
                )}

                {statusMsg && <p className="text-xs text-center text-zinc-500">{statusMsg}</p>}
              </div>
            )}

            <div className="border-t border-zinc-100 pt-3 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">Servidor Evolution API ativo</span>
              <button
                onClick={() => {
                  setModalOpen(false);
                  reloadInstances();
                }}
                className="btn-primary text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

