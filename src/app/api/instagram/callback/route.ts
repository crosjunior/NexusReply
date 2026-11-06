import { NextResponse, type NextRequest } from "next/server";
import { encrypt, readState } from "@/lib/crypto";
import { exchangeCode, getMe, subscribeWebhooks, toLongLived } from "@/lib/instagram/api";
import { admin } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const back = (msg: string, ok = false) =>
    NextResponse.redirect(`${env.appUrl}/app/settings?${ok ? "connected" : "error"}=${encodeURIComponent(msg)}`);

  if (p.get("error")) return back(p.get("error_description") ?? "Conexão cancelada");
  const code = p.get("code")?.replace(/#_$/, "");
  const state = readState(p.get("state") ?? "");
  if (!code || !state) return back("Link de conexão expirado. Tente novamente.");

  const session = await getSessionContext();
  if (!session || session.user.id !== state.uid || session.workspaceId !== state.ws) {
    return back("Sessão inválida. Entre novamente e reconecte.");
  }

  try {
    const short = await exchangeCode(code);
    const long = await toLongLived(short.accessToken);
    const me = await getMe(long.access_token);

    let subscribed = false;
    try {
      await subscribeWebhooks(long.access_token, String(me.user_id));
      subscribed = true;
    } catch (err) {
      console.error("[ig connect] subscribe failed", err);
    }

    const db = admin();
    const { data: other } = await db
      .from("ig_accounts")
      .select("workspace_id")
      .eq("ig_user_id", String(me.user_id))
      .maybeSingle();
    if (other && other.workspace_id !== state.ws) {
      return back("Esta conta do Instagram já está conectada a outro workspace.");
    }

    const { error } = await db.from("ig_accounts").upsert(
      {
        workspace_id: state.ws,
        ig_user_id: String(me.user_id),
        app_scoped_id: String(me.id),
        username: me.username,
        name: me.name ?? null,
        profile_picture_url: me.profile_picture_url ?? null,
        access_token_enc: encrypt(long.access_token),
        token_expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(),
        status: "active",
        webhook_subscribed: subscribed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ig_user_id" },
    );
    if (error) throw error;
    return back(`@${me.username} conectado`, true);
  } catch (err) {
    console.error("[ig connect]", err);
    return back(err instanceof Error ? err.message : "Falha ao conectar");
  }
}
