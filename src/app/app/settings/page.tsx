import { requireSession } from "@/lib/supabase/server";
import { disconnectAccount } from "../actions";
import { env } from "@/lib/env";
import { WhatsAppCard } from "@/components/settings/WhatsAppCard";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const { connected, error } = await searchParams;
  const { supabase, workspaceId } = await requireSession();

  const [igRes, waRes] = await Promise.all([
    supabase
      .from("ig_accounts")
      .select("id, username, name, profile_picture_url, status, webhook_subscribed, token_expires_at")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected"),
    supabase
      .from("whatsapp_accounts")
      .select("id, phone_number_id, waba_id, display_phone_number, name, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected"),
  ]);

  const accounts = igRes.data ?? [];
  const waAccounts = waRes.data ?? [];

  const igWebhookUrl = `${env.appUrl}/api/webhooks/instagram`;
  const waWebhookUrl = `${env.appUrl}/api/webhooks/whatsapp`;

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Canais de Conexão</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie suas contas conectadas da Meta para Instagram e WhatsApp Cloud API.
        </p>
      </div>

      {connected && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{connected} ✓</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {/* WhatsApp Section */}
      <WhatsAppCard
        accounts={waAccounts}
        webhookUrl={waWebhookUrl}
        verifyToken={env.waVerifyToken || env.igVerifyToken}
      />

      {/* Instagram Section */}
      <div className="space-y-6 pt-4 border-t border-zinc-200">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
              IG
            </span>
            Conta do Instagram
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Conecte sua conta profissional do Instagram para automação de mensagens diretas e respostas a comentários.
          </p>
        </div>

        <div className="card divide-y divide-zinc-100">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-4">
              {a.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.profile_picture_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-zinc-200" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-zinc-900">@{a.username}</div>
                <div className="text-xs text-zinc-500">
                  {a.status === "active" ? (
                    <span className="text-emerald-600 font-medium">● Conectada e ativa</span>
                  ) : (
                    <span className="text-red-500 font-medium">● Token expirado — reconecte</span>
                  )}
                  {a.token_expires_at && ` · token até ${new Date(a.token_expires_at).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <form action={disconnectAccount.bind(null, a.id)}>
                <button className="btn-danger text-xs">Desconectar</button>
              </form>
            </div>
          ))}
          <div className="p-4">
            <a href="/api/instagram/connect" className="btn-primary">
              {accounts.length ? "Reconectar / trocar conta" : "Conectar Instagram"}
            </a>
            <p className="mt-2 text-xs text-zinc-500">
              Requer conta profissional (Business ou Creator). Você será levado ao login oficial da Meta para autorizar.
            </p>
          </div>
        </div>

        <div className="card space-y-3 p-5 text-sm">
          <h3 className="font-medium text-zinc-900">Configuração do Webhook do Instagram na Meta</h3>
          <p className="text-zinc-600 text-xs">No Meta App Dashboard → Instagram → Webhooks, use:</p>
          <div>
            <div className="label">Callback URL</div>
            <code className="block break-all rounded bg-zinc-100 px-2 py-1.5 text-xs text-zinc-800">{igWebhookUrl}</code>
          </div>
          <div>
            <div className="label">Verify token</div>
            <code className="block rounded bg-zinc-100 px-2 py-1.5 text-xs text-zinc-800">valor de INSTAGRAM_WEBHOOK_VERIFY_TOKEN</code>
          </div>
          <div>
            <div className="label">Redirect OAuth</div>
            <code className="block break-all rounded bg-zinc-100 px-2 py-1.5 text-xs text-zinc-800">{env.appUrl}/api/instagram/callback</code>
          </div>
          <p className="text-xs text-zinc-500">Campos a assinar: comments, messages, messaging_postbacks, messaging_seen, messaging_referral.</p>
        </div>
      </div>
    </div>
  );
}
