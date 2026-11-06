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

/** Usuário logado + workspace atual (primeiro workspace do usuário). */
export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  let { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!member) {
    // Se o usuario existe no auth mas nao tem workspace no ReplyFlow (ex: conta legada ou criada antes), provisiona automaticamente
    const { admin } = await import("./admin");
    const name = (user.user_metadata?.workspace_name as string) || user.email?.split("@")[0] || "Workspace";
    const { data: newWs } = await admin()
      .from("workspaces")
      .insert({ name, owner_id: user.id })
      .select("id, name")
      .single();
    if (newWs) {
      await admin()
        .from("workspace_members")
        .insert({ workspace_id: newWs.id, user_id: user.id, role: "owner" });
      member = {
        workspace_id: newWs.id,
        role: "owner",
        workspaces: { name: newWs.name },
      } as unknown as typeof member;
    }
  }

  if (!member) return null;
  const ws = member.workspaces as unknown as { name: string } | null;
  return {
    supabase,
    user,
    workspaceId: member.workspace_id as string,
    workspaceName: ws?.name ?? "Workspace",
    role: member.role as string,
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
