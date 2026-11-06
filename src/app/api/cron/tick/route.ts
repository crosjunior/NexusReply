import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { tick } from "@/lib/runtime/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await tick(45_000);
  return NextResponse.json(result);
}

// Vercel Cron usa GET; pg_net (Supabase) usa POST
export const GET = handle;
export const POST = handle;
