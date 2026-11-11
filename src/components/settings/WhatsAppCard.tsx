"use client";

import { useState } from "react";
import { saveWhatsAppAccount, disconnectWhatsAppAccount } from "@/app/app/actions";
import { WhatsappConnectionsManager } from "@/components/connections/WhatsappConnectionsManager";
import { ChevronDown, ChevronUp, Sparkles, MessageSquare, ShieldCheck, QrCode } from "lucide-react";

interface WaAccount {
  id: string;
  phone_number_id: string;
  waba_id: string | null;
  display_phone_number: string | null;
  name: string | null;
  status: string;
}

export function WhatsAppCard({
  accounts,
  webhookUrl,
  verifyToken,
}: {
  accounts: WaAccount[];
  webhookUrl: string;
  verifyToken: string;
}) {
  const [showMetaCloudForm, setShowMetaCloudForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleMetaSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await saveWhatsAppAccount(formData);
      if (!res.ok) {
        setError(res.error ?? "Erro ao conectar conta de WhatsApp.");
      } else {
        setSuccess("Conta de WhatsApp oficial conectada e validada com sucesso!");
        setShowMetaCloudForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Conexão Principal: Modelo Rápido e Simples NexusCRM (QR Code & Pareamento) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-white font-bold text-xs shadow-xs">
                WA
              </span>
              <h2 className="text-lg font-bold text-zinc-900">
                Conexão WhatsApp (Modo Rápido NexusCRM)
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                Recomendado
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Conecte qualquer número de WhatsApp em segundos lendo o QR Code ou digitando o código de pareamento no celular — sem burocracias de aprovação ou tokens da Meta.
            </p>
          </div>
        </div>

        {/* Gerenciador NexusCRM Completo */}
        <WhatsappConnectionsManager />
      </div>

      {/* 2. Opção Secundária / Avançada: WhatsApp Oficial da Meta (Cloud API) */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
              Avançado
            </span>
            <span className="text-xs font-semibold text-zinc-800">
              Preferir WhatsApp Oficial (Meta Cloud API com Templates)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowMetaCloudForm(!showMetaCloudForm)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 transition"
          >
            {showMetaCloudForm ? (
              <>
                Ocultar formulário <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Configurar credenciais da Meta <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {showMetaCloudForm && (
          <div className="mt-4 pt-4 border-t border-zinc-200 space-y-4">
            <p className="text-xs text-zinc-500">
              Exige aplicativo verificado no Meta for Developers, WhatsApp Business Account ID (WABA) e token permanente do sistema.
            </p>

            {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
            {success && <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{success}</div>}

            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white p-3 border border-zinc-200">
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900 block">{a.name || a.display_phone_number}</span>
                  <span className="text-zinc-500 font-mono">Phone ID: {a.phone_number_id}</span>
                </div>
                <form action={disconnectWhatsAppAccount.bind(null, a.id)}>
                  <button className="btn-danger text-xs py-1 px-2.5">Desconectar</button>
                </form>
              </div>
            ))}

            <form onSubmit={handleMetaSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    Phone Number ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phoneNumberId"
                    required
                    placeholder="Ex: 104829102948291"
                    className="input w-full text-sm"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Encontrado no painel da Meta: WhatsApp &gt; Introdução.
                  </p>
                </div>

                <div>
                  <label className="label">WhatsApp Business Account ID (WABA ID)</label>
                  <input
                    type="text"
                    name="wabaId"
                    placeholder="Ex: 948201948201928"
                    className="input w-full text-sm"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">Identificador da conta empresarial da Meta.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Número de telefone de exibição</label>
                  <input
                    type="text"
                    name="displayPhoneNumber"
                    placeholder="+55 11 99999-9999"
                    className="input w-full text-sm"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">Número oficial com código do país.</p>
                </div>

                <div>
                  <label className="label">
                    Token de Acesso permanente da Meta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="accessToken"
                    required
                    placeholder="EAA..."
                    className="input w-full text-sm font-mono"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Token do Usuário do Sistema gerado no Meta Business Suite.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Validando com a Meta..." : "Salvar e Conectar WhatsApp Oficial"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
