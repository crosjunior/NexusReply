import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Camera,
  MessageSquare,
  MessageCircle,
  Users,
  Workflow,
  Radio,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { requireSession } from "@/lib/supabase/server";
import { getEvolutionStatus } from "./settings/evolution-actions";

export default async function Dashboard() {
  const { supabase, workspaceId } = await requireSession();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [
    account,
    evoStatus,
    contacts,
    newContacts,
    flows,
    published,
    sessions,
    openConvs,
    messagesRes,
  ] = await Promise.all([
    supabase
      .from("ig_accounts")
      .select("username, status, profile_picture_url")
      .eq("workspace_id", workspaceId)
      .neq("status", "disconnected")
      .maybeSingle(),
    getEvolutionStatus(),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", since),
    supabase.from("flows").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase
      .from("flows")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "published"),
    supabase
      .from("flow_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", since),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "human"),
    supabase
      .from("messages")
      .select("id, payload, created_at, kind, direction")
      .eq("workspace_id", workspaceId),
  ]);

  const allMsgs = messagesRes.data ?? [];
  const igMsgs = allMsgs.filter(
    (m) =>
      !m.payload ||
      typeof m.payload !== "object" ||
      (m.payload as { channel?: string }).channel !== "whatsapp"
  );
  const waMsgs = allMsgs.filter(
    (m) =>
      m.payload &&
      typeof m.payload === "object" &&
      (m.payload as { channel?: string }).channel === "whatsapp"
  );

  const igRecent = igMsgs.filter((m) => m.created_at >= since).length;
  const waRecent = waMsgs.filter((m) => m.created_at >= since).length;

  const isWaConnected = evoStatus.status === "open";

  const steps = [
    { done: !!account.data, label: "Conectar conta do Instagram", href: "/app/settings" },
    { done: isWaConnected || !!evoStatus.instanceName, label: "Conectar WhatsApp (Evolution API)", href: "/app/settings" },
    { done: (flows.count ?? 0) > 0, label: "Criar o primeiro fluxo", href: "/app/flows" },
    { done: (published.count ?? 0) > 0, label: "Publicar um fluxo", href: "/app/flows" },
    { done: (contacts.count ?? 0) > 0, label: "Receber o primeiro contato", href: "/app/contacts" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      {/* Título & Boas-vindas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Visão Geral</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Acompanhe o desempenho de mensagens, conexões ativas e automações em tempo real.
          </p>
        </div>

        <Link
          href="/app/flows/new"
          className="btn-primary self-start sm:self-auto flex items-center gap-1.5 shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          Criar Novo Fluxo
        </Link>
      </div>

      {/* 1. SEÇÃO DE CONEXÕES ATIVAS (Instagram & WhatsApp) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Conexões Ativas
          </h2>
          <Link
            href="/app/settings"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Gerenciar Conexões <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Conexão: Instagram */}
          <div className="card flex items-center gap-4 p-5 transition-all hover:border-zinc-300 shadow-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white shadow-xs">
              <Camera className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-pink-600">
                  Instagram Direct
                </span>
                {account.data?.status === "active" && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              {account.data ? (
                <>
                  <div className="font-bold text-zinc-900 text-base truncate">
                    @{account.data.username}
                  </div>
                  <div className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                    ● Conectado e recebendo eventos
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-zinc-900 text-sm">Nenhuma conta conectada</div>
                  <div className="text-xs text-zinc-500">Conecte sua conta profissional</div>
                </>
              )}
            </div>

            <Link
              href="/app/settings"
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition shrink-0"
            >
              {account.data ? "Gerenciar" : "Conectar"}
            </Link>
          </div>

          {/* Card Conexão: WhatsApp Evolution API */}
          <div className="card flex items-center gap-4 p-5 transition-all hover:border-zinc-300 shadow-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs">
              <MessageCircle className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  WhatsApp (Evolution)
                </span>
                {isWaConnected && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              <div className="font-bold text-zinc-900 text-base truncate">
                {evoStatus.instanceName}{" "}
                <span className="font-normal font-mono text-xs text-zinc-500">
                  (+55 34 95330-9898)
                </span>
              </div>

              <div
                className={`text-xs font-medium flex items-center gap-1.5 mt-0.5 ${
                  isWaConnected ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isWaConnected ? (
                  <>● Conectado via Baileys</>
                ) : (
                  <>● Pronto para pareamento / QR Code</>
                )}
              </div>
            </div>

            <Link
              href="/app/settings"
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition shrink-0"
            >
              Gerenciar
            </Link>
          </div>
        </div>
      </div>

      {/* 2. INDICADORES DE MENSAGENS (Instagram vs WhatsApp) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Indicadores de Mensagens & Atendimento
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* MENSAGENS INSTAGRAM */}
          <div className="card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-pink-500" />
                Mensagens Instagram
              </span>
              <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-700">
                IG
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">
              {igMsgs.length}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>+{igRecent} nos últimos 7 dias</span>
            </div>
          </div>

          {/* MENSAGENS WHATSAPP */}
          <div className="card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                Mensagens WhatsApp
              </span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                WA
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">
              {waMsgs.length}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              {waRecent > 0 ? `+${waRecent} recentes` : "Instância NexusReplay pronta"}
            </div>
          </div>

          {/* CONTATOS */}
          <div className="card p-5">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500" />
                Total de Contatos
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">
              {contacts.count ?? 0}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              +{newContacts.count ?? 0} em 7 dias
            </div>
          </div>

          {/* EXECUÇÕES DE FLUXOS */}
          <div className="card p-5">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Workflow className="h-4 w-4 text-purple-500" />
                Execuções de Fluxo
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-zinc-900">
              {sessions.count ?? 0}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              últimos 7 dias • 100% automação
            </div>
          </div>
        </div>

        {/* Linha secundária de status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium">Fluxos Ativos</span>
                <div className="text-base font-bold text-zinc-900">
                  {published.count ?? 0} <span className="text-xs font-normal text-zinc-400">de {flows.count ?? 0} configurados</span>
                </div>
              </div>
            </div>
            <Link
              href="/app/flows"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver fluxos →
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-medium">Aguardando Humano</span>
                <div className="text-base font-bold text-zinc-900">
                  {openConvs.count ?? 0} <span className="text-xs font-normal text-zinc-400">no inbox</span>
                </div>
              </div>
            </div>
            <Link
              href="/app/inbox"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Abrir inbox →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. PRIMEIROS PASSOS */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-zinc-900 text-sm">Checklist de Configuração</h2>
        <ul className="space-y-3">
          {steps.map((s) => (
            <li key={s.label}>
              <Link
                href={s.href}
                className="flex items-center gap-3 text-sm hover:text-brand-700 group transition"
              >
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-300 group-hover:text-zinc-400 shrink-0" />
                )}
                <span
                  className={
                    s.done
                      ? "text-zinc-400 line-through"
                      : "text-zinc-700 font-medium group-hover:text-zinc-900"
                  }
                >
                  {s.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
