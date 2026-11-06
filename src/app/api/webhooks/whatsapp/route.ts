import { after, NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifyMetaSignature } from "@/lib/crypto";
import { dedupeWaKey, normalizeWaWebhook } from "@/lib/whatsapp/webhook";
import { admin } from "@/lib/supabase/admin";
import { processStoredEvent } from "@/lib/runtime/process-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Verificao do webhook do WhatsApp (Meta App Dashboard -> WhatsApp -> Configuration -> Callback URL). */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");

  if (mode === "subscribe" && (token === env.waVerifyToken || token === env.igVerifyToken)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Recebe eventos do WhatsApp Cloud API.
 * Persiste no banco de dados e processa em background com after().
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = env.waAppSecret || env.igAppSecret;

  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const events = normalizeWaWebhook(body as Parameters<typeof normalizeWaWebhook>[0]).filter(
    (e) => e.kind !== "ignored"
  );
  if (!events.length) return NextResponse.json({ ok: true });

  const rows = events.map((e) => ({
    dedupe_key: dedupeWaKey(e),
    ig_user_id: `wa:${e.phoneNumberId}`, // campo compartilhado de identificador da conta no webhook_events
    kind: "wa_message",
    payload: e,
  }));

  const { data, error } = await admin()
    .from("webhook_events")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id, kind, payload");

  if (error) {
    console.error("[whatsapp webhook] persist failed", error);
    return new NextResponse("DB error", { status: 500 });
  }

  const ids = (data ?? []).map((r) => r.id);

  after(async () => {
    for (const id of ids) {
      await processStoredEvent(id);
    }
  });

  return NextResponse.json({ ok: true });
}
