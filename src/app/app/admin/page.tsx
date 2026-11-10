import { redirect } from "next/navigation";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ShieldCheck, Users, Workflow, MessageSquare, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { AdminUsersManager, type AdminUserRow } from "@/components/admin/AdminUsersManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await requireSession();

  // Apenas carlos@conexaoagil.com.br tem permissão para acessar esta área
  if (user.email?.toLowerCase() !== "carlos@conexaoagil.com.br") {
    redirect("/app");
  }

  const db = admin();

  // Carrega workspaces e estatísticas globais
  const [wsRes, authUsersRes, flowsRes, igRes, contactsRes, messagesRes] = await Promise.all([
    db.from("workspaces").select("*").order("created_at", { ascending: false }),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("flows").select("workspace_id, id"),
    db.from("ig_accounts").select("workspace_id, id"),
    db.from("contacts").select("workspace_id, id"),
    db.from("messages").select("workspace_id, id"),
  ]);

  const workspaces = wsRes.data ?? [];
  const authUsers = authUsersRes.data?.users ?? [];
  const flows = flowsRes.data ?? [];
  const igAccounts = igRes.data ?? [];
  const contacts = contactsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  // Mapeia e-mail do auth.users pelo ID
  const emailMap = new Map<string, string>();
  for (const u of authUsers) {
    if (u.id && u.email) emailMap.set(u.id, u.email);
  }

  // Agrega contadores por workspace
  const flowsCountMap = new Map<string, number>();
  for (const f of flows) flowsCountMap.set(f.workspace_id, (flowsCountMap.get(f.workspace_id) ?? 0) + 1);

  const igCountMap = new Map<string, number>();
  for (const ig of igAccounts) igCountMap.set(ig.workspace_id, (igCountMap.get(ig.workspace_id) ?? 0) + 1);

  const contactsCountMap = new Map<string, number>();
  for (const c of contacts) contactsCountMap.set(c.workspace_id, (contactsCountMap.get(c.workspace_id) ?? 0) + 1);

  const messagesCountMap = new Map<string, number>();
  for (const m of messages) messagesCountMap.set(m.workspace_id, (messagesCountMap.get(m.workspace_id) ?? 0) + 1);

  const userRows: AdminUserRow[] = workspaces.map((w) => {
    const email = emailMap.get(w.owner_id) || "sem-email@nexusia.work";
    const isCarlos = email.toLowerCase() === "carlos@conexaoagil.com.br";
    const isUnlimited = isCarlos || Boolean(w.is_unlimited);
    const isBlocked = !isCarlos && Boolean(w.is_blocked);
    const createdAt = w.created_at || new Date().toISOString();
    const defaultTrialEnd = new Date(new Date(createdAt).getTime() + 20 * 86400000).toISOString();
    const trialEndsAt = w.trial_ends_at || defaultTrialEnd;
    const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));

    return {
      workspaceId: w.id,
      workspaceName: w.name || "Workspace",
      ownerId: w.owner_id,
      email,
      createdAt,
      trialEndsAt,
      daysLeft,
      isBlocked,
      isUnlimited,
      flowsLimit: isUnlimited ? 999999 : (Number(w.flows_limit) || 1),
      igAccountsLimit: isUnlimited ? 999999 : (Number(w.ig_accounts_limit) || 1),
      whatsappEnabled: isUnlimited || Boolean(w.whatsapp_enabled),
      subscriptionStatus: isBlocked ? "blocked" : isUnlimited ? "unlimited" : daysLeft <= 0 ? "expired" : "trial",
      flowsCount: flowsCountMap.get(w.id) ?? 0,
      igAccountsCount: igCountMap.get(w.id) ?? 0,
      contactsCount: contactsCountMap.get(w.id) ?? 0,
      messagesCount: messagesCountMap.get(w.id) ?? 0,
    };
  });

  // Métricas de topo
  const totalUsers = userRows.length;
  const trialUsers = userRows.filter((u) => !u.isUnlimited && !u.isBlocked && u.daysLeft > 0).length;
  const unlimitedUsers = userRows.filter((u) => u.isUnlimited).length;
  const totalFlows = flows.length;
  const totalMessages = messages.length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Painel Master de Administração</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Acesso exclusivo para <span className="font-semibold text-zinc-800">{user.email}</span>. Gerencie todos os usuários, controle períodos de teste, libere planos ilimitados e monitore o uso da plataforma.
          </p>
        </div>
      </div>

      {/* Cards de Métricas Globais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <Users className="h-4 w-4 text-brand-600" /> Total de Usuários
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{totalUsers}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Cadastros registrados</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Clock className="h-4 w-4" /> Em Teste (20 dias)
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{trialUsers}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Usuários ativos</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <Sparkles className="h-4 w-4" /> Assinantes VIP
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{unlimitedUsers}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Acesso ilimitado</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600">
            <Workflow className="h-4 w-4" /> Total de Fluxos
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{totalFlows}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Criados no sistema</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
            <MessageSquare className="h-4 w-4" /> Mensagens
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{totalMessages}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Enviadas e recebidas</div>
        </div>
      </div>

      {/* Gestor e Tabela de Usuários */}
      <AdminUsersManager initialUsers={userRows} />
    </div>
  );
}

