import { after, NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifyMetaSignature } from "@/lib/crypto";
import { dedupeKey, normalizeWebhook } from "@/lib/instagram/webhook";
import { admin } from "@/lib/supabase/admin";
import { processStoredEvent } from "@/lib/runtime/process-event";
import { enqueue } from "@/lib/runtime/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Verificação do webhook (Meta App Dashboard → Webhooks → Verify). */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === env.igVerifyToken) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Recebe eventos. Regra de ouro: persistir e responder 200 rápido.
 * O processamento roda depois da resposta (after) e, se falhar, o cron reprocessa.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), env.igAppSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
    console.log("[webhook:instagram] Raw payload:", raw.slice(0, 300));
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const events = normalizeWebhook(body as Parameters<typeof normalizeWebhook>[0]).filter((e) => e.kind !== "ignored");
  console.log(`[webhook:instagram] Normalized ${events.length} valid events:`, events.map((e) => `${e.kind} (${e.igUserId})`));
  if (!events.length) return NextResponse.json({ ok: true });

  const rows = events.map((e) => ({
    dedupe_key: dedupeKey(e),
    ig_user_id: e.igUserId,
    kind: e.kind,
    payload: e,
  }));

  const { data, error } = await admin()
    .from("webhook_events")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id, kind, payload");
  if (error) {
    console.error("[webhook] persist failed", error);
    return new NextResponse("DB error", { status: 500 }); // Meta reenvia
  }

  const now: string[] = [];
  for (const r of data ?? []) {
    const isEcho = r.kind === "message" && (r.payload as { isEcho?: boolean }).isEcho;
    if (isEcho) {
      // espera o envio do bot ser registrado antes de classificar o echo
      await enqueue("process_event", { eventId: r.id }, new Date(Date.now() + 10_000));
    } else {
      now.push(r.id);
    }
  }

  after(async () => {
    for (const id of now) await processStoredEvent(id);
  });

  return NextResponse.json({ ok: true });
}
