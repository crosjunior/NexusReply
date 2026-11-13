"use client";

import { useState, useEffect, useTransition } from "react";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Power,
  Copy,
  Check,
  Radio,
  Settings2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  type EvolutionState,
  fetchQrCode,
  fetchPairingCode,
  configureWebhook,
  restartInstance,
  disconnectInstance,
} from "@/app/app/settings/evolution-actions";

export function EvolutionWhatsAppCard({
  initialState,
}: {
  initialState: EvolutionState;
}) {
  const [state, setState] = useState<EvolutionState>(initialState);
  const [isPending, startTransition] = useTransition();

  // Modais de conexão
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(25);
  const [qrLoading, setQrLoading] = useState(false);

  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingPhone, setPairingPhone] = useState(initialState.phoneNumber || "5534953309898");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Auto-refresh do QR Code enquanto modal estiver aberto
  useEffect(() => {
    if (!qrModalOpen) return;
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          void loadQr();
          return 25;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrModalOpen]);

  async function loadQr() {
    setQrLoading(true);
    const res = await fetchQrCode();
    setQrLoading(false);
    if (res.ok && res.base64) {
      setQrBase64(res.base64);
      setQrCountdown(25);
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Não foi possível carregar o QR Code da Evolution API.",
      });
    }
  }

  function handleOpenQr() {
    setQrModalOpen(true);
    void loadQr();
  }

  async function handleGeneratePairingCode(e: React.FormEvent) {
    e.preventDefault();
    setPairingLoading(true);
    setPairingCode(null);
    const res = await fetchPairingCode(pairingPhone);
    setPairingLoading(false);
    if (res.ok && res.code) {
      setPairingCode(res.code);
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Falha ao solicitar código de pareamento no celular.",
      });
    }
  }

  function copyCode() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSyncWebhook() {
    startTransition(async () => {
      const res = await configureWebhook();
      setFeedback({
        type: res.ok ? "success" : "error",
        message: res.message || res.error || "",
      });
    });
  }

  async function handleRestart() {
    startTransition(async () => {
      const res = await restartInstance();
      setFeedback({
        type: res.ok ? "success" : "error",
        message: res.message || res.error || "",
      });
    });
  }

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar a sessão do WhatsApp na Evolution API?")) return;
    startTransition(async () => {
      const res = await disconnectInstance();
      setState((prev) => ({ ...prev, status: "close" }));
      setFeedback({
        type: res.ok ? "success" : "error",
        message: res.message || res.error || "",
      });
    });
  }

  const isConnected = state.status === "open";
  const isConnecting = state.status === "connecting";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">WhatsApp (Evolution API)</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                Oficial Evolution v2
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              Conexão estável e ilimitada via Baileys com gerenciamento em tempo real.
            </p>
          </div>
        </div>

        {/* Badge de status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Conectado e Ativo
            </div>
          ) : isConnecting ? (
            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Conectando...
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 border border-zinc-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Aguardando Pareamento / Leitura QR
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cartão de Informações da Instância */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-200/80">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Instância Ativa
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">{state.instanceName}</span>
            <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
              {state.channel}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Número Configurado
          </span>
          <div className="mt-1 text-sm font-bold text-zinc-900 font-mono">
            +55 (34) 95330-9898
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Servidor Evolution
          </span>
          <div className="mt-1 text-xs font-mono text-zinc-600 truncate">
            {state.serverUrl}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          onClick={handleOpenQr}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
        >
          <QrCode className="h-4 w-4" />
          Conectar via QR Code
        </button>

        <button
          onClick={() => setPairingModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
        >
          <Smartphone className="h-4 w-4 text-emerald-600" />
          Código de Pareamento
        </button>

        <button
          onClick={handleSyncWebhook}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
        >
          <Zap className="h-4 w-4 text-amber-500" />
          {isPending ? "Configurando..." : "Sincronizar Webhook"}
        </button>

        <a
          href={state.managerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
        >
          <ExternalLink className="h-4 w-4 text-blue-500" />
          Painel Evolution Manager
        </a>

        {isConnected && (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition ml-auto"
          >
            <Power className="h-3.5 w-3.5" />
            Desconectar
          </button>
        )}
      </div>

      {/* Modal QR Code */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-zinc-900">Escanear QR Code no WhatsApp</h3>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-50 p-6 border border-zinc-200">
              {qrLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
                  <span className="text-xs text-zinc-500">Gerando QR Code...</span>
                </div>
              ) : qrBase64 ? (
                <div className="flex flex-col items-center space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                    alt="QR Code WhatsApp"
                    className="h-64 w-64 rounded-lg bg-white p-2 shadow-sm border border-zinc-200"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Atualiza em <strong>{qrCountdown}s</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-zinc-600">Não foi possível carregar a imagem do QR.</p>
                  <button onClick={loadQr} className="btn-secondary text-xs">
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-50/60 p-3.5 text-xs text-emerald-900 space-y-1 border border-emerald-100">
              <span className="font-bold block">Como conectar:</span>
              <p>1. Abra o WhatsApp no seu celular (+55 34 95330-9898).</p>
              <p>2. Toque em <strong>Configurações &gt; Aparelhos conectados</strong>.</p>
              <p>3. Toque em <strong>Conectar um aparelho</strong> e aponte para a tela.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setQrModalOpen(false)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Concluir Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Código de Pareamento */}
      {pairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-zinc-900">Pareamento sem Câmera</h3>
              </div>
              <button
                onClick={() => setPairingModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGeneratePairingCode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Número de telefone com DDI e DDD:
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={pairingPhone}
                    onChange={(e) => setPairingPhone(e.target.value)}
                    placeholder="5534953309898"
                    className="input flex-1 text-sm font-mono"
                    required
                  />
                  <button
                    type="submit"
                    disabled={pairingLoading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {pairingLoading ? "Gerando..." : "Gerar Código"}
                  </button>
                </div>
              </div>
            </form>

            {pairingCode && (
              <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 p-6 text-white space-y-3">
                <span className="text-xs text-zinc-400">Digite este código no seu WhatsApp:</span>
                <div className="font-mono text-3xl font-bold tracking-widest text-emerald-400 select-all">
                  {pairingCode}
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar Código
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="rounded-xl bg-zinc-50 p-3.5 text-xs text-zinc-600 space-y-1 border border-zinc-200">
              <span className="font-bold text-zinc-800 block">Instruções no celular:</span>
              <p>1. No WhatsApp, vá em <strong>Aparelhos conectados &gt; Conectar um aparelho</strong>.</p>
              <p>2. Toque em <strong>Conectar com número de telefone</strong> abaixo da câmera.</p>
              <p>3. Digite o código de 8 caracteres exibido acima.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
