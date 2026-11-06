/**
 * Normaliza o payload de webhook da Meta em eventos internos.
 * Um POST pode conter vários entries e vários eventos.
 */

export type NormalizedEvent =
  | {
      kind: "message";
      igUserId: string; // conta do negócio
      senderId: string; // IGSID do usuário
      mid: string;
      text: string;
      quickReplyPayload?: string;
      attachments?: { type: string; payload?: { url?: string } }[];
      storyReply?: { id?: string; url?: string };
      isEcho: boolean;
      timestamp: number;
    }
  | {
      kind: "postback";
      igUserId: string;
      senderId: string;
      mid: string;
      title: string;
      payload: string;
      timestamp: number;
    }
  | {
      kind: "comment";
      igUserId: string;
      commentId: string;
      parentId?: string;
      text: string;
      fromId: string;
      fromUsername?: string;
      mediaId?: string;
      mediaProductType?: string;
      timestamp: number;
    }
  | { kind: "ignored"; igUserId: string; reason: string; timestamp: number };

interface RawEntry {
  id: string;
  time?: number;
  messaging?: RawMessaging[];
  changes?: { field: string; value: RawCommentValue }[];
}
interface RawMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    quick_reply?: { payload: string };
    attachments?: { type: string; payload?: { url?: string } }[];
    reply_to?: { story?: { id?: string; url?: string }; mid?: string };
  };
  postback?: { mid: string; title: string; payload: string };
  read?: unknown;
  reaction?: unknown;
}
interface RawCommentValue {
  id: string;
  text?: string;
  parent_id?: string;
  from?: { id: string; username?: string };
  media?: { id: string; media_product_type?: string };
}

export function normalizeWebhook(body: { object?: string; entry?: RawEntry[] }): NormalizedEvent[] {
  const out: NormalizedEvent[] = [];
  if (body.object !== "instagram") return out;

  for (const entry of body.entry ?? []) {
    const igUserId = String(entry.id);

    for (const m of entry.messaging ?? []) {
      if (m.postback) {
        out.push({
          kind: "postback",
          igUserId,
          senderId: m.sender.id,
          mid: m.postback.mid,
          title: m.postback.title,
          payload: m.postback.payload,
          timestamp: m.timestamp,
        });
      } else if (m.message && !m.message.is_deleted) {
        const isEcho = !!m.message.is_echo;
        out.push({
          kind: "message",
          igUserId,
          // em echo o "sender" é a própria conta; o usuário é o recipient
          senderId: isEcho ? m.recipient.id : m.sender.id,
          mid: m.message.mid,
          text: m.message.text ?? "",
          quickReplyPayload: m.message.quick_reply?.payload,
          attachments: m.message.attachments,
          storyReply: m.message.reply_to?.story,
          isEcho,
          timestamp: m.timestamp,
        });
      } else {
        out.push({ kind: "ignored", igUserId, reason: "read/reaction", timestamp: m.timestamp });
      }
    }

    for (const ch of entry.changes ?? []) {
      if (ch.field !== "comments" && ch.field !== "live_comments") continue;
      const v = ch.value;
      if (!v?.from?.id) continue;
      out.push({
        kind: "comment",
        igUserId,
        commentId: v.id,
        parentId: v.parent_id,
        text: v.text ?? "",
        fromId: v.from.id,
        fromUsername: v.from.username,
        mediaId: v.media?.id,
        mediaProductType: v.media?.media_product_type,
        timestamp: (entry.time ?? Math.floor(Date.now() / 1000)) * 1000,
      });
    }
  }
  return out;
}

export function dedupeKey(e: NormalizedEvent): string {
  switch (e.kind) {
    case "message":
      return `msg:${e.mid}`;
    case "postback":
      return `pb:${e.mid}`;
    case "comment":
      return `cm:${e.commentId}`;
    default:
      return `ig:${e.igUserId}:${e.timestamp}:${e.reason}`;
  }
}
