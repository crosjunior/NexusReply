/**
 * Normaliza o payload de webhook da WhatsApp Cloud API da Meta em eventos internos.
 */

export type NormalizedWaEvent =
  | {
      kind: "wa_message";
      phoneNumberId: string;
      wabaId?: string;
      from: string; // nmero de telefone de quem enviou (ex: "5511999999999")
      name?: string; // nome de exibio do perfil do usurio
      mid: string; // identificador da mensagem (wamid.xxx)
      timestamp: number;
      text: string;
      isButtonReply?: boolean;
      buttonPayload?: string; // payload codificado (ex: rf1|flowId|nodeId|handleId)
      buttonTitle?: string;
    }
  | {
      kind: "ignored";
      phoneNumberId: string;
      reason: string;
      timestamp: number;
    };

interface RawWaEntry {
  id: string; // WABA ID
  changes?: Array<{
    field: string;
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number?: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile?: { name?: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        interactive?: {
          type: "button_reply" | "list_reply";
          button_reply?: { id: string; title: string };
          list_reply?: { id: string; title: string; description?: string };
        };
        image?: { id: string; caption?: string; mime_type?: string };
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
  }>;
}

export function normalizeWaWebhook(body: { object?: string; entry?: RawWaEntry[] }): NormalizedWaEvent[] {
  const out: NormalizedWaEvent[] = [];
  if (body.object !== "whatsapp_business_account") return out;

  for (const entry of body.entry ?? []) {
    const wabaId = String(entry.id);

    for (const ch of entry.changes ?? []) {
      if (ch.field !== "messages") continue;
      const val = ch.value;
      if (!val || !val.metadata) continue;

      const phoneNumberId = val.metadata.phone_number_id;

      // Ignora atualizaes de status de envio/leitura
      if (val.statuses && (!val.messages || val.messages.length === 0)) {
        out.push({
          kind: "ignored",
          phoneNumberId,
          reason: "status_update",
          timestamp: Date.now(),
        });
        continue;
      }

      const contactsMap = new Map<string, string>();
      for (const c of val.contacts ?? []) {
        if (c.profile?.name) {
          contactsMap.set(c.wa_id, c.profile.name);
        }
      }

      for (const m of val.messages ?? []) {
        const timestamp = Number(m.timestamp) * 1000 || Date.now();
        const from = m.from;
        const name = contactsMap.get(from);
        const mid = m.id;

        if (m.type === "interactive" && m.interactive) {
          const btn = m.interactive.button_reply || m.interactive.list_reply;
          out.push({
            kind: "wa_message",
            phoneNumberId,
            wabaId,
            from,
            name,
            mid,
            timestamp,
            text: btn?.title ?? "",
            isButtonReply: true,
            buttonPayload: btn?.id,
            buttonTitle: btn?.title,
          });
        } else if (m.type === "text" && m.text) {
          out.push({
            kind: "wa_message",
            phoneNumberId,
            wabaId,
            from,
            name,
            mid,
            timestamp,
            text: m.text.body,
          });
        } else if (m.type === "image") {
          out.push({
            kind: "wa_message",
            phoneNumberId,
            wabaId,
            from,
            name,
            mid,
            timestamp,
            text: m.image?.caption ?? "[imagem]",
          });
        } else {
          out.push({
            kind: "wa_message",
            phoneNumberId,
            wabaId,
            from,
            name,
            mid,
            timestamp,
            text: `[${m.type}]`,
          });
        }
      }
    }
  }

  return out;
}

export function dedupeWaKey(e: NormalizedWaEvent): string {
  if (e.kind === "wa_message") {
    return `wa:msg:${e.mid}`;
  }
  return `wa:${e.phoneNumberId}:${e.timestamp}:${e.reason}`;
}
