import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

/** Cliente com a sessão do usuário (respeita RLS). Usar em Server Components/Actions/Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado de Server Component: o proxy renova a sessão
        }
      },
    },
  });
}

export interface WorkspaceAccess {
  id: string;
  name: string;
  isSuperAdmin: boolean;
  isUnlimited: boolean;
  isBlocked: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  flowsLimit: number;
  igAccountsLimit: number;
  whatsappEnabled: boolean;
  subscriptionStatus: "trial" | "active" | "unlimited" | "expired" | "blocked";
  trialEndsAt: string;
}

/** Usuário logado + workspace atual (primeiro workspace do usuário). */
export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const isSuperAdmin = user.email?.toLowerCase() === "carlos@conexaoagil.com.br";

  let { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(*)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!member) {
    // Se o usuario existe no auth mas nao tem workspace no ReplyFlow, provisiona automaticamente com 20 dias de teste
    const { admin } = await import("./admin");
    const name = (user.user_metadata?.workspace_name as string) || user.email?.split("@")[0] || "Workspace";
    const trialDays = isSuperAdmin ? 36500 : 20;
    const trialEnds = new Date(Date.now() + trialDays * 86400000).toISOString();

    const insertPayload: Record<string, unknown> = {
      name,
      owner_id: user.id,
      trial_ends_at: trialEnds,
      is_blocked: false,
      is_unlimited: isSuperAdmin,
      flows_limit: isSuperAdmin ? 999999 : 1,
      ig_accounts_limit: isSuperAdmin ? 999999 : 1,
      whatsapp_enabled: isSuperAdmin,
      subscription_status: isSuperAdmin ? "unlimited" : "trial",
    };

    const { data: newWs, error: insertErr } = await admin()
      .from("workspaces")
      .insert(insertPayload)
      .select("*")
      .single();

    if (newWs) {
      await admin()
        .from("workspace_members")
        .insert({ workspace_id: newWs.id, user_id: user.id, role: "owner" });
      member = {
        workspace_id: newWs.id,
        role: "owner",
        workspaces: newWs,
      } as unknown as typeof member;
    } else if (insertErr) {
      // Fallback gracioso caso colunas de trial ainda nao existam
      const { data: fallbackWs } = await admin()
        .from("workspaces")
        .insert({ name, owner_id: user.id })
        .select("*")
        .single();
      if (fallbackWs) {
        await admin()
          .from("workspace_members")
          .insert({ workspace_id: fallbackWs.id, user_id: user.id, role: "owner" });
        member = {
          workspace_id: fallbackWs.id,
          role: "owner",
          workspaces: fallbackWs,
        } as unknown as typeof member;
      }
    }
  }

  if (!member) return null;
  const ws = (member.workspaces as unknown as Record<string, unknown>) || {};
  const wsName = (ws.name as string) || "Workspace";
  const createdAt = (ws.created_at as string) || new Date().toISOString();

  // Calcula vigencia de 20 dias a partir de trial_ends_at ou created_at
  const defaultTrialEnd = new Date(new Date(createdAt).getTime() + 20 * 86400000).toISOString();
  const trialEndsAt = (ws.trial_ends_at as string) || defaultTrialEnd;
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
  const isUnlimited = isSuperAdmin || Boolean(ws.is_unlimited);
  const isBlocked = !isSuperAdmin && Boolean(ws.is_blocked);
  const isTrialExpired = !isUnlimited && daysLeft <= 0;
  const flowsLimit = isUnlimited ? 999999 : (Number(ws.flows_limit) || 1);
  const igAccountsLimit = isUnlimited ? 999999 : (Number(ws.ig_accounts_limit) || 1);
  const whatsappEnabled = isUnlimited || Boolean(ws.whatsapp_enabled);
  const subscriptionStatus = isBlocked
    ? "blocked"
    : isUnlimited
    ? "unlimited"
    : isTrialExpired
    ? "expired"
    : "trial";

  const access: WorkspaceAccess = {
    id: member.workspace_id as string,
    name: wsName,
    isSuperAdmin,
    isUnlimited,
    isBlocked,
    isTrialExpired,
    daysLeft,
    flowsLimit,
    igAccountsLimit,
    whatsappEnabled,
    subscriptionStatus,
    trialEndsAt,
  };

  return {
    supabase,
    user,
    workspaceId: member.workspace_id as string,
    workspaceName: wsName,
    role: member.role as string,
    workspace: access,
  };
}

export async function requireSession() {
  const ctx = await getSessionContext();
  if (!ctx) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return ctx!;
}
