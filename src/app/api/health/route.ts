import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Healthcheck para Docker/Caddy/monitoramento: app + banco + profundidade da fila. */
export async function GET() {
  const started = Date.now();
  try {
    const db = admin();
    const [jobs, failedEvents] = await Promise.all([
      db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued").lte("run_at", new Date().toISOString()),
      db.from("webhook_events").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ]);
    if (jobs.error) throw jobs.error;
    return NextResponse.json({
      ok: true,
      db_ms: Date.now() - started,
      jobs_due: jobs.count ?? 0,
      webhook_failed: failedEvents.count ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
