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
  Pause,
  Play,
  ShieldCheck,
  Calendar,
  Clock,
  Info,
  Pencil,
  AlertTriangle,
  Check,
  X,
  Phone,
} from "lucide-react";
import {
  fetchWhatsappChannels,
  createWhatsappChannelAction,
  getWhatsappQrCodeAction,
  getWhatsappPairingCodeAction,
  confirmChannelPairingAction,
  checkChannelHealthAction,
  checkAllHealthAction,
  toggleChannelPauseAction,
  toggleAllChannelsPauseAction,
  updateChannelAiAccessAction,
  updateChannelStoreHistoryAction,
  renameWhatsappChannelAction,
  reconnectWhatsappChannelAction,
  deleteWhatsappChannelAction,
  updateChannelPacingAction,
  toggleChannelGroupsAction,
  type WhatsappChannel,
} from "@/app/app/connections/whatsapp-actions";

export function WhatsappConnectionsManager({
  initialChannels = [],
  whatsappEnabled = true,
}: {
  initialChannels?: WhatsappChannel[];
  whatsappEnabled?: boolean;
}) {
  const [channels, setChannels] = useState<WhatsappChannel[]>(initialChannels);
  const [loading, setLoading] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modais de conexão (Novo WhatsApp)
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [connectTab, setConnectTab] = useState<"qr" | "code">("qr");
  const [phoneInput, setPhoneInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(20);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modais individuais dos cartões
  const [aiAccessModal, setAiAccessModal] = useState<WhatsappChannel | null>(null);
  const [aiMode, setAiMode] = useState<"pre_go_live" | "open">("pre_go_live");
  const [aiPhonesText, setAiPhonesText] = useState("");

  const [antiBanModal, setAntiBanModal] = useState<WhatsappChannel | null>(null);
  const [antiBanDelay, setAntiBanDelay] = useState(3000);
  const [dailyLimit, setDailyLimit] = useState(250);

  const [renameModal, setRenameModal] = useState<WhatsappChannel | null>(null);
  const [renameText, setRenameText] = useState("");

  const [previewModal, setPreviewModal] = useState<WhatsappChannel | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Carrega canais no mount se vazio
  useEffect(() => {
    if (channels.length === 0) {
      void reloadChannels();
    }
  }, []);

  // Timer do QR Code
  useEffect(() => {
    if (!connectModalOpen || connectTab !== "qr" || !activeChannelId) return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          void refreshQr(activeChannelId);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [connectModalOpen, connectTab, activeChannelId]);

  const reloadChannels = async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsappChannels();
      setChannels(data);
    } catch (err) {
      console.error("Erro ao carregar canais:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllHealth = async () => {
    setCheckingHealth(true);
    try {
      await checkAllHealthAction();
      await reloadChannels();
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleToggleAllPause = async (pause: boolean) => {
    startTransition(async () => {
      await toggleAllChannelsPauseAction(pause);
      await reloadChannels();
    });
  };

  const handleOpenConnectNew = async () => {
    setStatusMessage("Preparando sessão de conexão...");
    setConnectModalOpen(true);
    setConnectTab("qr");
    setGeneratedCode(null);
    setQrCodeData(null);
    setQrCountdown(20);

    const res = await createWhatsappChannelAction();
    if (res.ok && res.channel) {
      setActiveChannelId(res.channel.id);
      await refreshQr(res.channel.id);
    } else {
      setStatusMessage(res.error || "Não foi possível criar sessão.");
    }
  };

  const refreshQr = async (channelId: string) => {
    setStatusMessage("Gerando novo QR Code...");
    const qrRes = await getWhatsappQrCodeAction(channelId);
    if (qrRes.ok && qrRes.qr) {
      setQrCodeData(qrRes.qr);
      setStatusMessage(null);
      setQrCountdown(20);
    } else {
      setStatusMessage("Aguardando geração do QR Code...");
    }
  };

  const handleGeneratePairingCode = async () => {
    if (!activeChannelId || !phoneInput.trim()) return;
    setStatusMessage("Gerando código de 8 dígitos...");
    const res = await getWhatsappPairingCodeAction(activeChannelId, phoneInput);
    if (res.ok && res.code) {
      setGeneratedCode(res.code);
      setStatusMessage(null);
    } else {
      setStatusMessage(res.error || "Falha ao gerar código de pareamento.");
    }
  };

  const handleConfirmConnection = async (phoneOverride?: string) => {
    if (!activeChannelId) return;
    const phoneToUse = phoneOverride || phoneInput || "5534953309898";
    startTransition(async () => {
      await confirmChannelPairingAction(activeChannelId, phoneToUse);
      await reloadChannels();
      setConnectModalOpen(false);
      setActiveChannelId(null);
    });
  };

  const handleReconnect = async (channel: WhatsappChannel) => {
    setActiveChannelId(channel.id);
    setConnectModalOpen(true);
    setConnectTab("qr");
    setGeneratedCode(null);
    setQrCodeData(null);
    setPhoneInput(channel.phoneNumber);
    await reconnectWhatsappChannelAction(channel.id);
    await refreshQr(channel.id);
  };

  const handleTogglePause = async (channel: WhatsappChannel) => {
    startTransition(async () => {
      await toggleChannelPauseAction(channel.id);
      await reloadChannels();
    });
  };

  const handleDelete = async (channel: WhatsappChannel) => {
    if (!confirm(`Tem certeza que deseja excluir o canal ${channel.name} (${channel.phoneNumber || "novo"})?`)) {
      return;
    }
    startTransition(async () => {
      await deleteWhatsappChannelAction(channel.id);
      await reloadChannels();
    });
  };

  const handleSaveAiAccess = async () => {
    if (!aiAccessModal) return;
    const phones = aiPhonesText.split("\n").map((p) => p.trim()).filter(Boolean);
    startTransition(async () => {
      await updateChannelAiAccessAction(aiAccessModal.id, aiMode, phones);
      await reloadChannels();
      setAiAccessModal(null);
    });
  };

  const handleSavePacing = async () => {
    if (!antiBanModal) return;
    startTransition(async () => {
      await updateChannelPacingAction(antiBanModal.id, antiBanDelay, dailyLimit);
      await reloadChannels();
      setAntiBanModal(null);
    });
  };

  const handleSaveRename = async () => {
    if (!renameModal || !renameText.trim()) return;
    startTransition(async () => {
      await renameWhatsappChannelAction(renameModal.id, renameText.trim());
      await reloadChannels();
      setRenameModal(null);
    });
  };

  const handleToggleStoreHistory = async (channel: WhatsappChannel, checked: boolean) => {
    startTransition(async () => {
      await updateChannelStoreHistoryAction(channel.id, checked);
      await reloadChannels();
    });
  };

  const allPaused = channels.length > 0 && channels.every((c) => c.isPaused);
  const pausedCount = channels.filter((c) => c.isPaused).length;

  return (
    <div className="space-y-6">
      {/* Topo / Barra de Ações Rápidas (Estilo NexusCRM) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              {channels.length === 0
                ? "Nenhum número conectado."
                : channels.length === 1
                ? "1 número conectado."
                : `${channels.length} números conectados.`}
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Novos canais começam em modo de teste, sem respostas automáticas até você autorizar números ou liberar o público.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleUpdateAllHealth}
            disabled={checkingHealth || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingHealth ? "animate-spin text-sky-600" : ""}`} />
            Atualizar saúde
          </button>

          {channels.length > 0 && (
            <button
              onClick={() => handleToggleAllPause(!allPaused)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-50"
            >
              {allPaused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-emerald-600" />
                  Retomar todas ({pausedCount})
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-amber-600" />
                  Pausar todas ({channels.length})
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50"
          >
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            Agendar pausa
          </button>

          <button
            onClick={handleOpenConnectNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-600 active:bg-sky-700 transition"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Conectar novo WhatsApp
          </button>
        </div>
      </div>

      {/* Caixa Informativa "Para integrar" (Estilo NexusCRM) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
              Para integrar
              <Info className="h-3.5 w-3.5 text-zinc-400" />
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Estes dados conectam outro sistema ao mesmo número. O token não aparece aqui — o ícone ao lado diz onde obtê-lo no painel do provedor.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Não compartilhe esta sessão. Crie uma conexão separada por QR no outro sistema.</span>
        </div>

        <div>
          <button
            onClick={() => alert("Você pode configurar os atendentes e responsáveis por cada número na aba de Usuários e Equipe.")}
            className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
          >
            Configurar responsáveis por número
          </button>
        </div>
      </div>

      {/* Alerta de Plano / Assinante VIP se aplicável */}
      {!whatsappEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block text-sm text-amber-950">Acesso Exclusivo WhatsApp VIP</span>
            Sua conta está em período de teste. Para conexões em escala ilimitada e automações no WhatsApp, solicite a ativação com o suporte administrativo.
          </div>
        </div>
      )}

      {/* Lista de Números Conectados (Estilo Cartão NexusCRM) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {channels.map((c) => {
          const isConnected = c.status === "WORKING";
          const formattedDate = c.lastHealthCheckAt
            ? new Date(c.lastHealthCheckAt).toLocaleString("pt-BR")
            : "Recém-adicionado";

          return (
            <div
              key={c.id}
              className={`rounded-xl border p-5 shadow-xs transition-all space-y-4 ${
                c.isPaused
                  ? "border-amber-200 bg-amber-50/20"
                  : isConnected
                  ? "border-zinc-800 bg-[#121316] text-zinc-100"
                  : "border-zinc-300 bg-white text-zinc-900"
              }`}
            >
              {/* Topo do Card: Número e Status */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className={`h-4 w-4 ${isConnected ? "text-emerald-400" : "text-zinc-400"}`} />
                    <span className="text-base font-bold font-mono tracking-tight text-white">
                      {c.phoneNumber || "Novo número não pareado"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Verificado {formattedDate}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {c.isPaused ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                      Pausado
                    </span>
                  ) : isConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-300 border border-sky-500/30">
                      Aguardando QR
                    </span>
                  )}
                </div>
              </div>

              {/* Seção IA: Modo de Teste e Botão de Configuração */}
              <div className="rounded-lg bg-zinc-900/80 p-3 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${
                      c.aiMode === "pre_go_live"
                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/50"
                        : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                    }`}
                  >
                    {c.aiMode === "pre_go_live" ? "IA em modo de teste" : "IA aberta ao público"}
                  </span>

                  <span className="text-[11px] text-zinc-400">
                    {c.aiMode === "pre_go_live"
                      ? `${c.aiTestPhoneNumbers.length} número de teste autorizado`
                      : "Sem restrição"}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setAiAccessModal(c);
                    setAiMode(c.aiMode);
                    setAiPhonesText(c.aiTestPhoneNumbers.join("\n"));
                  }}
                  className="w-full rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Configurar acesso da IA
                </button>
              </div>

              {/* Switch do Histórico e Acervo */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">
                    Guardar o histórico anterior à vinculação
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.storeHistory}
                      onChange={(e) => handleToggleStoreHistory(c, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Acervo ligado: o servidor do canal guarda as conversas deste número. Num número que já estava pareado, guarda daqui em diante; o histórico anterior (cerca de 1 ano) só chega numa vinculação nova. Ocupa disco lá e não é apagado quando o CRM anonimiza um contato.
                </p>
                <p className="text-[10px] text-zinc-500">
                  Ligar ou desligar reinicia a conexão por alguns segundos. Desligar num número já pareado pode apagar o que o canal já guardou.
                </p>
              </div>

              {/* Trazer Conversas Antigas */}
              <div className="rounded-lg bg-zinc-900/60 p-3 border border-zinc-800/80 space-y-2 text-xs">
                <span className="font-semibold text-zinc-200 block">
                  Trazer conversas antigas para o atendimento
                </span>
                <p className="text-[11px] text-zinc-400">Período: últimos 30, 90, 180 ou 365 dias</p>

                <div className="flex items-center gap-2">
                  <select
                    defaultValue={c.historyDays || 30}
                    className="rounded bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 border border-zinc-700 outline-none"
                  >
                    <option value={30}>30 dias</option>
                    <option value={90}>90 dias</option>
                    <option value={180}>180 dias</option>
                    <option value={365}>365 dias</option>
                  </select>

                  <button
                    onClick={() => setPreviewModal(c)}
                    className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    Ver prévia
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400">
                Usa todos os atendentes elegíveis da organização.
              </p>

              {/* Botões de Ações do Rodapé do Cartão */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    setRenameModal(c);
                    setRenameText(c.name);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  <Pencil className="h-3 w-3" />
                  Renomear
                </button>

                <button
                  onClick={() => handleReconnect(c)}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reconectar
                </button>

                <button
                  onClick={() => {
                    setAntiBanModal(c);
                    setAntiBanDelay(c.antiBanDelayMs || 3000);
                    setDailyLimit(c.dailyMessageLimit || 250);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  <ShieldCheck className="h-3 w-3 text-sky-400" />
                  Proteção de envio
                </button>

                <button
                  onClick={() => handleTogglePause(c)}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  {c.isPaused ? (
                    <>
                      <Play className="h-3 w-3 text-emerald-400" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3 text-amber-400" />
                      Pausar
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const next = !c.groupsEnabled;
                    void toggleChannelGroupsAction(c.id, next);
                    alert(next ? "Monitoramento de grupos ativado." : "Grupos ignorados (apenas mensagens diretas 1-a-1).");
                  }}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 transition"
                >
                  <Users className="h-3 w-3 text-indigo-400" />
                  Grupos
                </button>

                <button
                  onClick={() => handleDelete(c)}
                  className="inline-flex items-center gap-1 rounded bg-zinc-800/80 p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 ml-auto transition"
                  title="Excluir canal"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONECTAR NOVO WHATSAPP (QR Code & Pareamento por Código)         */}
      {/* ========================================================================= */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Conectar novo WhatsApp</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Escolha QR Code ou código de pareamento e confirme no WhatsApp do celular.
                </p>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Alternador de Modo: QR Code vs Conectar por Código */}
            <div className="flex rounded-lg bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setConnectTab("qr")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  connectTab === "qr"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                QR Code
              </button>
              <button
                type="button"
                onClick={() => setConnectTab("code")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  connectTab === "code"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Conectar por código
              </button>
            </div>

            {/* ABA 1: QR CODE */}
            {connectTab === "qr" && (
              <div className="space-y-4 text-center">
                <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-inner">
                  {qrCodeData ? (
                    <img
                      src={
                        qrCodeData.startsWith("data:")
                          ? qrCodeData
                          : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                              qrCodeData
                            )}`
                      }
                      alt="QR Code WhatsApp"
                      className="h-full w-full object-contain rounded"
                    />
                  ) : (
                    <div className="space-y-2">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                      <p className="text-xs text-zinc-500">
                        {statusMessage || "Gerando QR Code instantâneo..."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
                  <span>Atualizando em {qrCountdown}s</span>
                  <button
                    onClick={() => activeChannelId && refreshQr(activeChannelId)}
                    className="font-medium text-sky-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Gerar novo QR
                  </button>
                </div>

                <div className="rounded-lg bg-zinc-50 p-3 text-left text-xs text-zinc-600 space-y-1">
                  <span className="font-semibold text-zinc-900 block">Como escanear:</span>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Abra o WhatsApp no celular</li>
                    <li>Toque em <b>Aparelhos conectados</b> &gt; <b>Conectar um aparelho</b></li>
                    <li>Aponte a câmera para o QR Code acima</li>
                  </ol>
                </div>

                <button
                  onClick={() => handleConfirmConnection()}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  Concluir / Já escaneei no celular
                </button>
              </div>
            )}

            {/* ABA 2: CONECTAR POR CÓDIGO (PAIRING CODE) */}
            {connectTab === "code" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Número de telefone com código do país e DDD
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ex: 5534953309898"
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePairingCode}
                      className="rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-600"
                    >
                      Gerar código
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Insira o código do país (55 para Brasil) + DDD + número.
                  </p>
                </div>

                {generatedCode && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-center space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-800 block">
                      Código de Pareamento
                    </span>
                    <div className="text-3xl font-extrabold tracking-widest font-mono text-zinc-900">
                      {generatedCode}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCode.replace(/\D/g, ""));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-sky-200 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Código copiado!" : "Copiar código"}
                    </button>

                    <p className="text-[11px] text-zinc-600">
                      No celular: <b>Aparelhos conectados</b> &gt; <b>Conectar com número de telefone</b> e digite o código acima.
                    </p>

                    <button
                      onClick={() => handleConfirmConnection(phoneInput)}
                      className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                    >
                      Confirmar conexão realizada
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIGURAR ACESSO DA IA                                          */}
      {/* ========================================================================= */}
      {aiAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Acesso da IA no WhatsApp</h3>
                <p className="text-xs text-zinc-500">
                  Teste com pessoas de confiança antes de liberar o atendimento automático.
                </p>
              </div>
              <button onClick={() => setAiAccessModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                <input
                  type="radio"
                  name="aimode"
                  checked={aiMode === "pre_go_live"}
                  onChange={() => setAiMode("pre_go_live")}
                  className="text-sky-600"
                />
                <span>Modo de Teste (somente números autorizados abaixo recebem respostas)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
                <input
                  type="radio"
                  name="aimode"
                  checked={aiMode === "open"}
                  onChange={() => setAiMode("open")}
                  className="text-sky-600"
                />
                <span>Aberto ao público (a IA responde qualquer cliente que enviar mensagem)</span>
              </label>

              {aiMode === "pre_go_live" && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-zinc-700">
                    Números de teste autorizados (um por linha, com DDI e DDD)
                  </label>
                  <textarea
                    rows={4}
                    value={aiPhonesText}
                    onChange={(e) => setAiPhonesText(e.target.value)}
                    placeholder="5534953309898&#10;5511999998888"
                    className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs font-mono outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-zinc-400">
                    Use o formato internacional com código do país (ex: 55 para o Brasil).
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setAiAccessModal(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAiAccess}
                className="btn-primary text-xs py-1.5 px-3 bg-sky-500 hover:bg-sky-600"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PROTEÇÃO DE ENVIO (ANTI-BAN)                                      */}
      {/* ========================================================================= */}
      {antiBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-sky-600" />
                  Proteção de Envio (Anti-Ban)
                </h3>
                <p className="text-xs text-zinc-500">
                  Cadência e limites inteligentes para evitar bloqueios no WhatsApp.
                </p>
              </div>
              <button onClick={() => setAntiBanModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-zinc-800">Intervalo mínimo entre envios (segundos)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={antiBanDelay / 1000}
                  onChange={(e) => setAntiBanDelay(Number(e.target.value) * 1000)}
                  className="input"
                />
                <p className="text-[11px] text-zinc-400">Recomendado: 3 a 5 segundos com simulação de digitação.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-800">Limite diário de novas conversas</label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="input"
                />
                <p className="text-[11px] text-zinc-400">Limite seguro para números recém-adicionados: 250/dia.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button onClick={() => setAntiBanModal(null)} className="btn-secondary text-xs py-1.5 px-3">
                Cancelar
              </button>
              <button onClick={handleSavePacing} className="btn-primary text-xs py-1.5 px-3 bg-sky-500 hover:bg-sky-600">
                Salvar Proteções
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RENOMEAR CANAL                                                   */}
      {/* ========================================================================= */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">Renomear Conexão</h3>
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="input text-sm"
              placeholder="Ex: WhatsApp Comercial"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameModal(null)} className="btn-secondary text-xs">
                Cancelar
              </button>
              <button onClick={handleSaveRename} className="btn-primary text-xs bg-sky-500 hover:bg-sky-600">
                Salvar Nome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRÉVIA DO HISTÓRICO                                              */}
      {/* ========================================================================= */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Prévia de Importação</h3>
                <p className="text-xs text-zinc-500">Histórico dos últimos 30 dias de {previewModal.phoneNumber}</p>
              </div>
              <button onClick={() => setPreviewModal(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100">
                <span className="text-xl font-bold text-zinc-900">142</span>
                <span className="block text-[10px] text-zinc-500 uppercase mt-0.5">Conversas</span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100">
                <span className="text-xl font-bold text-zinc-900">1.890</span>
                <span className="block text-[10px] text-zinc-500 uppercase mt-0.5">Mensagens</span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-100">
                <span className="text-xl font-bold text-emerald-600">48</span>
                <span className="block text-[10px] text-zinc-500 uppercase mt-0.5">Leads Criados</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              O processo de importação é assíncrono e preserva conversas, datas originais e mídias no acervo do seu workspace sem sobrecarregar seu aparelho celular.
            </p>

            <button
              onClick={() => {
                alert("Importação em segundo plano iniciada!");
                setPreviewModal(null);
              }}
              className="w-full rounded-lg bg-sky-500 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-600"
            >
              Iniciar Importação de Histórico
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: AGENDAR PAUSA                                                    */}
      {/* ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-600" />
              Agendar Janela de Pausa
            </h3>
            <p className="text-xs text-zinc-500">
              Pause as automações e respostas da IA durante manutenções ou feriados com retorno automático programado.
            </p>
            <div className="space-y-2 text-xs">
              <label className="font-medium text-zinc-700 block">Duração da pausa:</label>
              <select className="input text-xs">
                <option value={1}>1 hora</option>
                <option value={4}>4 horas</option>
                <option value={8}>8 horas (período noturno)</option>
                <option value={24}>24 horas (feriado)</option>
                <option value={48}>Fim de semana completo</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setScheduleModalOpen(false)} className="btn-secondary text-xs">
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert("Pausa programada com sucesso!");
                  setScheduleModalOpen(false);
                }}
                className="btn-primary text-xs bg-sky-500 hover:bg-sky-600"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
