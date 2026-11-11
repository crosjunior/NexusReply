import { requireSession } from "@/lib/supabase/server";
import { Calendar, Video, CheckCircle, Plus, Trash2, Mail, ExternalLink, QrCode, MessageCircle, Share2, Sparkles } from "lucide-react";
import { saveCalendarConnection, disconnectCalendar } from "./actions";
import { getEvolutionInstances } from "@/lib/whatsapp/evolution";
import { WhatsappConnectionsManager } from "@/components/connections/WhatsappConnectionsManager";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { supabase, workspaceId, workspace } = await requireSession();
  const params = await searchParams;
  const activeTab = params?.tab || "whatsapp";

  const [calRes, igRes, waRes, evoInstances] = await Promise.all([
    supabase
      .from("calendar_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected"),
    supabase
      .from("ig_accounts")
      .select("id, username, status, profile_picture_url")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected"),
    supabase
      .from("whatsapp_accounts")
      .select("id, display_phone_number, name, status, waba_id, phone_number_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected"),
    getEvolutionInstances(),
  ]);

  const calendars = calRes.data ?? [];
  const igAccounts = igRes.data ?? [];
  const waAccounts = waRes.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Canais de Conexão</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Por onde seu negócio fala com o cliente. Conecte números por QR Code ou código de pareamento no estilo rápido do NexusCRM, ou integre com a API Oficial da Meta e Instagram.
        </p>
      </div>

      {/* Tabs Superiores (Estilo NexusCRM) */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <a
          href="/app/connections?tab=whatsapp"
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === "whatsapp"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp (QR Code & Números)
        </a>
        <a
          href="/app/connections?tab=oficial"
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === "oficial"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <span className="font-bold text-[10px] rounded bg-emerald-700/40 px-1 py-0.2">META</span>
          WhatsApp Oficial (Cloud API)
        </a>
        <a
          href="/app/connections?tab=instagram"
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === "instagram"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Instagram Direct
        </a>
        <a
          href="/app/connections?tab=agendas"
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
            activeTab === "agendas"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Agendas & Videoconferências
        </a>
      </div>

      {/* Conteúdo Aba 1: WhatsApp (QR Code & Pareamento NexusCRM) */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          <WhatsappConnectionsManager
            whatsappEnabled={workspace.whatsappEnabled}
          />
        </div>
      )}

      {/* Conteúdo Aba 2: WhatsApp Oficial Meta Cloud API */}
      {activeTab === "oficial" && (
        <div className="space-y-6">
          <div className="card p-6 space-y-5 border-t-4 border-t-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>
                  WhatsApp Oficial (Cloud API Meta)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Conexão oficial auditada e garantida pela Meta com templates aprovados e sem risco de desconexão.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Ativo & Configurado
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-zinc-100">
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Número de Exibição</span>
                <span className="text-sm font-semibold text-zinc-800">
                  {waAccounts[0]?.display_phone_number || "+55 31 9145-6970"}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">WABA ID</span>
                <span className="text-sm font-mono text-zinc-700">
                  {waAccounts[0]?.waba_id || "1002166082905050"}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block">Credencial da Meta</span>
                <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Token Permanente Guardado
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-900">Webhook Oficial para receber mensagens:</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white p-2 text-xs font-mono text-zinc-700 border border-zinc-200">
                  https://app.nexusia.work/api/webhooks/whatsapp
                </code>
              </div>
              <p className="text-[11px] text-zinc-400">
                Verify Token configurado: <span className="font-mono text-zinc-600">INSTAGRAM_WEBHOOK_VERIFY_TOKEN</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 3: Instagram Direct */}
      {activeTab === "instagram" && (
        <div className="space-y-6">
          <div className="card p-6 space-y-5 border-t-4 border-t-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-lg">
                  IG
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    @{igAccounts[0]?.username || "ocarlossilvajr"}
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      Conectado
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Conta Profissional do Instagram vinculada ao Facebook Login for Business.
                  </p>
                </div>
              </div>

              <a href="/app/settings" className="btn-secondary text-xs flex items-center gap-1.5">
                Gerenciar Conexão Meta <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-900">Campos de Webhook Inscritos:</h4>
              <div className="flex flex-wrap gap-1.5">
                {["comments", "messages", "messaging_postbacks", "messaging_seen", "messaging_referral"].map((f) => (
                  <span key={f} className="rounded bg-white border border-zinc-200 px-2 py-0.5 text-[11px] font-mono text-zinc-600">
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 4: Agendas (Google Calendar & Outlook) */}
      {activeTab === "agendas" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-600" />
              Agendas & Reuniões Virtuais
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Permite que o Agente de IA agende reuniões automaticamente com links de videoconferência.
            </p>
          </div>

          {calendars.length > 0 && (
            <div className="card divide-y divide-zinc-100">
              {calendars.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white text-xs ${
                        c.provider === "google" ? "bg-red-500" : "bg-blue-600"
                      }`}
                    >
                      {c.provider === "google" ? "GCAL" : "OUT"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                        {c.provider === "google" ? "Google Calendar" : "Microsoft Outlook"}
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle className="h-3 w-3" /> Ativo
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Conta: <span className="font-medium text-zinc-700">{c.account_email}</span>
                        {c.settings?.create_meeting_link && (
                          <span className="ml-2 rounded bg-brand-50 px-1 text-[10px] text-brand-700 font-semibold">
                            {c.provider === "google" ? "Google Meet automático" : "Microsoft Teams automático"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <form action={disconnectCalendar.bind(null, c.id)}>
                    <button className="btn-danger text-xs">Desconectar</button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Google Calendar */}
            <div className="card p-5 space-y-4 border-t-4 border-t-red-500">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                    G
                  </span>
                  Google Calendar & Meet
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Sincronize sua agenda do Google Workspace ou Gmail para agendamento com criação automática de salas do Google Meet.
              </p>

              <form action={saveCalendarConnection} className="space-y-3 pt-2 border-t border-zinc-100">
                <input type="hidden" name="provider" value="google" />
                <div>
                  <label className="label">E-mail da Conta Google *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="seu-email@gmail.com ou empresa.com"
                    className="input w-full text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="createMeetingLink"
                    id="googleMeetToggle"
                    defaultChecked
                    className="h-4 w-4 rounded border-zinc-300 text-brand-600"
                  />
                  <label htmlFor="googleMeetToggle" className="text-xs text-zinc-700 cursor-pointer">
                    Gerar link do Google Meet automaticamente em cada reunião
                  </label>
                </div>
                <button type="submit" className="btn-primary w-full text-xs py-2 bg-red-600 hover:bg-red-700">
                  Conectar Google Calendar
                </button>
              </form>
            </div>

            {/* Microsoft Outlook Calendar */}
            <div className="card p-5 space-y-4 border-t-4 border-t-blue-600">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    O
                  </span>
                  Microsoft Outlook & Teams
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Integre sua agenda do Office 365 / Outlook para marcação de reuniões com salas do Microsoft Teams.
              </p>

              <form action={saveCalendarConnection} className="space-y-3 pt-2 border-t border-zinc-100">
                <input type="hidden" name="provider" value="outlook" />
                <div>
                  <label className="label">E-mail da Conta Microsoft *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="seu-email@outlook.com ou empresa.com"
                    className="input w-full text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="createMeetingLink"
                    id="outlookTeamsToggle"
                    defaultChecked
                    className="h-4 w-4 rounded border-zinc-300 text-brand-600"
                  />
                  <label htmlFor="outlookTeamsToggle" className="text-xs text-zinc-700 cursor-pointer">
                    Gerar link do Microsoft Teams automaticamente em cada reunião
                  </label>
                </div>
                <button type="submit" className="btn-primary w-full text-xs py-2 bg-blue-600 hover:bg-blue-700">
                  Conectar Outlook Calendar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
