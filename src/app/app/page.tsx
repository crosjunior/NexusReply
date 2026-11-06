import Link from "next/link";
import { CheckCircle2, Circle, Camera } from "lucide-react";
import { requireSession } from "@/lib/supabase/server";

export default async function Dashboard() {
  const { supabase, workspaceId } = await requireSession();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [account, contacts, newContacts, flows, published, sessions, openConvs] = await Promise.all([
    supabase.from("ig_accounts").select("username, status, profile_picture_url").eq("workspace_id", workspaceId).neq("status", "disconnected").maybeSingle(),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("flows").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("flows").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "published"),
    supabase.from("flow_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "human"),
  ]);

  const stats = [
    { label: "Contatos", value: contacts.count ?? 0, hint: `+${newContacts.count ?? 0} em 7 dias` },
    { label: "Execuções de fluxo", value: sessions.count ?? 0, hint: "últimos 7 dias" },
    { label: "Fluxos ativos", value: published.count ?? 0, hint: `${flows.count ?? 0} no total` },
    { label: "Aguardando humano", value: openConvs.count ?? 0, hint: "no inbox" },
  ];

  const steps = [
    { done: !!account.data, label: "Conectar conta do Instagram", href: "/app/settings" },
    { done: (flows.count ?? 0) > 0, label: "Criar o primeiro fluxo", href: "/app/flows" },
    { done: (published.count ?? 0) > 0, label: "Publicar um fluxo", href: "/app/flows" },
    { done: (contacts.count ?? 0) > 0, label: "Receber o primeiro contato", href: "/app/contacts" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Visão geral</h1>

      <div className="card flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {account.data ? (
            <>
              <div className="font-medium">@{account.data.username}</div>
              <div className={`text-xs ${account.data.status === "active" ? "text-emerald-600" : "text-red-600"}`}>
                {account.data.status === "active" ? "Conectado e recebendo eventos" : "Token expirado — reconecte"}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium">Nenhuma conta conectada</div>
              <div className="text-xs text-zinc-500">Conecte uma conta profissional (Business ou Creator)</div>
            </>
          )}
        </div>
        <Link href="/app/settings" className="btn-secondary">{account.data ? "Gerenciar" : "Conectar"}</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-zinc-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-zinc-400">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-medium">Primeiros passos</h2>
        <ul className="mt-3 space-y-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="flex items-center gap-3 text-sm hover:text-brand-700">
                {s.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-zinc-300" />}
                <span className={s.done ? "text-zinc-400 line-through" : ""}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
