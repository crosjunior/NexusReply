import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/supabase/server";
import { signState } from "@/lib/crypto";
import { authorizeUrl } from "@/lib/instagram/api";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.redirect(`${env.appUrl}/login`);
  const state = signState({ ws: ctx.workspaceId, uid: ctx.user.id });
  return NextResponse.redirect(authorizeUrl(state));
}
