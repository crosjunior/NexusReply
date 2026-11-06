/**
 * Cliente da WhatsApp Cloud API da Meta (graph.facebook.com).
 * Docs: developers.facebook.com/docs/whatsapp/cloud-api
 */
import { env } from "../env";
import { encodePayload } from "../engine/core";
import type { OutboundMessage } from "../engine/types";

export class WaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public subcode?: number,
  ) {
    super(message);
  }
}

const base = () => `https://graph.facebook.com/${env.graphVersion}`;

async function call<T>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const e = (json.error ?? {}) as { message?: string; code?: number; error_subcode?: number };
    throw new WaApiError(e.message ?? `HTTP ${res.status}`, res.status, e.code, e.error_subcode);
  }
  return json as T;
}

/** Formata número de telefone para o padrão do WhatsApp (somente dígitos, ex: 5511999999999). */
export function cleanPhoneNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Consulta os detalhes do número de telefone configurado na Meta. */
export async function getWaPhoneNumberDetails(token: string, phoneNumberId: string) {
  return call<{
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
  }>(`${base()}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, {
    token,
  });
}

/** Marca uma mensagem recebida como lida (check azul). */
export async function markWaRead(token: string, phoneNumberId: string, messageId: string) {
  try {
    await call(`${base()}/${phoneNumberId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
    /* opcional */
  }
}

/** Envia mensagem de texto simples. */
export async function sendWaText(token: string, phoneNumberId: string, to: string, text: string) {
  return call<{ messages: Array<{ id: string }> }>(`${base()}/${phoneNumberId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhoneNumber(to),
      type: "text",
      text: { body: text.slice(0, 4096) },
    }),
  });
}

/**
 * Converte a mensagem neutra do motor do ReplyFlow para o payload do WhatsApp Cloud API.
 * Se tiver botões (até 3), envia como "interactive" reply buttons.
 * Se tiver imagem, envia imagem com legenda.
 * Caso contrário, texto simples.
 */
export async function sendWaMessage(
  token: string,
  phoneNumberId: string,
  to: string,
  m: OutboundMessage,
  flowId: string,
  nodeId: string,
): Promise<{ message_id: string }> {
  const recipient = cleanPhoneNumber(to);
  const text = (m.text ?? "").slice(0, 4096);

  // 1. Mensagem com botões interativos (máx 3 botões rápidos no WhatsApp)
  const buttons = (m.buttons ?? [])
    .filter((b) => b.type === "postback")
    .slice(0, 3)
    .map((b) => ({
      type: "reply",
      reply: {
        id: encodePayload(flowId, nodeId, b.id),
        title: b.title.slice(0, 20),
      },
    }));

  if (buttons.length > 0) {
    const res = await call<{ messages: Array<{ id: string }> }>(`${base()}/${phoneNumberId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: text || "Escolha uma opção:" },
          action: { buttons },
        },
      }),
    });
    return { message_id: res.messages[0].id };
  }

  // 2. Mensagem com imagem
  if (m.imageUrl) {
    const res = await call<{ messages: Array<{ id: string }> }>(`${base()}/${phoneNumberId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "image",
        image: {
          link: m.imageUrl,
          ...(text ? { caption: text.slice(0, 1024) } : {}),
        },
      }),
    });
    return { message_id: res.messages[0].id };
  }

  // 3. Mensagem de texto simples
  const res = await sendWaText(token, phoneNumberId, recipient, text || " ");
  return { message_id: res.messages[0].id };
}
