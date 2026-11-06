"use client";

import { useState } from "react";
import { saveWhatsAppAccount, disconnectWhatsAppAccount } from "@/app/app/actions";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(accounts.length === 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        setSuccess("Conta de WhatsApp conectada e validada com sucesso!");
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card divide-y divide-zinc-100">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  WA
                </span>
                Conta do WhatsApp (Meta Cloud API)
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Conecte seu nmero oficial do WhatsApp Business via Meta Cloud API para automao de conversas e fluxos.
              </p>
            </div>
            {accounts.length > 0 && !showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                + Adicionar / Alterar nmero
              </button>
            )}
          </div>
        </div>

        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                ?
              </div>
              <div>
                <div className="font-medium text-sm text-zinc-900">
                  {a.name ? `${a.name} ` : ""}
                  <span className="text-zinc-600">{a.display_phone_number || a.phone_number_id}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  Phone Number ID: <code className="bg-zinc-100 px-1 py-0.5 rounded">{a.phone_number_id}</code>
                  {a.waba_id && <>  WABA ID: <code className="bg-zinc-100 px-1 py-0.5 rounded">{a.waba_id}</code></>}
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Conectado
                  </span>
                </div>
              </div>
            </div>
            <form action={disconnectWhatsAppAccount.bind(null, a.id)}>
              <button className="btn-danger text-xs">Desconectar</button>
            </form>
          </div>
        ))}

        {showForm && (
          <div className="p-5 bg-zinc-50/50">
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
            {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Encontrado no painel da Meta: WhatsApp  Introduo ou Nmeros de telefone.
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
                  <p className="mt-1 text-[11px] text-zinc-500">Identificador da conta empresarial do WhatsApp.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nmero de telefone de exibio</label>
                  <input
                    type="text"
                    name="displayPhoneNumber"
                    placeholder="+55 11 99999-9999"
                    className="input w-full text-sm"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">O nmero oficial com cdigo do pas.</p>
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
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Token do Usurio do Sistema gerado no Meta Business Suite com permisso whatsapp_business_messaging.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {accounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={loading} className="btn-primary ml-auto text-xs">
                  {loading ? "Validando com a Meta..." : "Salvar e Conectar WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="card space-y-3 p-5 text-sm">
        <h3 className="font-medium text-zinc-900">Configurao do Webhook do WhatsApp na Meta</h3>
        <p className="text-zinc-600 text-xs">
          No <strong>Meta App Dashboard</strong>  <strong>WhatsApp</strong>  <strong>Configurao</strong> (Configuration), clique em <strong>Editar</strong> (Edit) em Webhook:
        </p>
        <div>
          <div className="label">Callback URL</div>
          <code className="block break-all rounded bg-zinc-100 px-2 py-1.5 text-xs text-zinc-800">{webhookUrl}</code>
        </div>
        <div>
          <div className="label">Verify token</div>
          <code className="block rounded bg-zinc-100 px-2 py-1.5 text-xs text-zinc-800">{verifyToken}</code>
        </div>
        <p className="text-xs text-zinc-500">
          Aps salvar a URL e o token de verificao, clique em <strong>Gerenciar</strong> (Manage) e assine o campo <strong>messages</strong>.
        </p>
      </div>
    </div>
  );
}
