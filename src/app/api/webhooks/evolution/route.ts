import { NextResponse, type NextRequest } from "next/server";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Validação de health check */
export async function GET() {
  return NextResponse.json({ ok: true, service: "Evolution Webhook Receiver" });
}

interface EvolutionWebhookBody {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
    state?: string;
  };
}

/** Recebe eventos da Evolution API (MESSAGES_UPSERT, CONNECTION_UPDATE, etc.) */
export async function POST(req: NextRequest) {
  let body: EvolutionWebhookBody;
  try {
    body = (await req.json()) as EvolutionWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  const eventName = body.event || "";
  const instanceName = body.instance || "NexusReplay";
  const data = body.data;

  // 1. Armazena evento em webhook_events para auditoria e histórico
  const dedupeKey = `evo:${instanceName}:${data?.key?.id || Date.now()}:${eventName}`;

  try {
    const db = admin();
    await db.from("webhook_events").upsert(
      {
        dedupe_key: dedupeKey,
        ig_user_id: `wa:${instanceName}`,
        kind: "wa_evolution",
        payload: body,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );

    // 2. Processa mensagens recebidas
    if (eventName === "messages.upsert" && data?.key && data?.message) {
      const fromMe = Boolean(data.key.fromMe);
      const remoteJid = data.key.remoteJid || "";
      const text =
        data.message.conversation ||
        data.message.extendedTextMessage?.text ||
        "";
      const senderNumber = remoteJid.replace(/@.+$/, "");
      const pushName = data.pushName || senderNumber;

      // Localiza o workspace do admin ou primário
      const { data: workspaces } = await db
        .from("workspaces")
        .select("id")
        .limit(1);

      const workspaceId = workspaces?.[0]?.id;

      if (workspaceId && text) {
        // Registra mensagem na tabela messages
        await db.from("messages").insert({
          workspace_id: workspaceId,
          direction: fromMe ? "out" : "in",
          source: fromMe ? "agent" : "user",
          mid: data.key.id || `mid_${Date.now()}`,
          kind: "text",
          text,
          payload: {
            channel: "whatsapp",
            instance: instanceName,
            remoteJid,
            pushName,
            timestamp: data.messageTimestamp,
          },
        });
      }
    }
  } catch (err) {
    console.error("[Evolution Webhook Error]:", err);
  }

  return NextResponse.json({ ok: true });
}
