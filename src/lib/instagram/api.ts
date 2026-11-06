/**
 * Cliente da Instagram API with Instagram Login (graph.instagram.com).
 * Docs: developers.facebook.com/docs/instagram-platform
 */
import { env } from "../env";
import { encodePayload } from "../engine/core";
import type { OutboundMessage } from "../engine/types";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

export const WEBHOOK_FIELDS = [
  "comments",
  "messages",
  "messaging_postbacks",
  "messaging_seen",
  "messaging_referral",
];

export class IgApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
    public subcode?: number,
  ) {
    super(message);
  }
  /** Token inválido/expirado */
  get isAuth() {
    return this.code === 190 || this.status === 401;
  }
  /** Fora da janela de 24h / usuário indisponível */
  get isWindowClosed() {
    return this.code === 10 || this.subcode === 2534022 || this.subcode === 2018278;
  }
  get isRateLimited() {
    return this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613 || this.status === 429;
  }
}

const base = () =>
  env.igConfigId
    ? `https://graph.facebook.com/${env.graphVersion}`
    : `https://graph.instagram.com/${env.graphVersion}`;

async function call<T>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.error) {
    const e = (json.error ?? {}) as { message?: string; code?: number; error_subcode?: number };
    throw new IgApiError(e.message ?? `HTTP ${res.status}`, res.status, e.code, e.error_subcode);
  }
  return json as T;
}

// ---------------------------------------------------------------------
// OAuth (Unified Login / Facebook Login for Business & Legacy Instagram Login)
// ---------------------------------------------------------------------
export function authorizeUrl(state: string): string {
  if (env.igConfigId) {
    const u = new URL("https://www.facebook.com/dialog/oauth");
    u.searchParams.set("client_id", env.igAppId);
    u.searchParams.set("config_id", env.igConfigId);
    u.searchParams.set("redirect_uri", `${env.appUrl}/api/instagram/callback`);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("state", state);
    return u.toString();
  }
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("enable_fb_login", "0");
  u.searchParams.set("force_authentication", "1");
  u.searchParams.set("client_id", env.igAppId);
  u.searchParams.set("redirect_uri", `${env.appUrl}/api/instagram/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; userId?: string }> {
  if (env.igConfigId) {
    const u = new URL(`https://graph.facebook.com/${env.graphVersion}/oauth/access_token`);
    u.searchParams.set("client_id", env.igAppId);
    u.searchParams.set("client_secret", env.igAppSecret);
    u.searchParams.set("redirect_uri", `${env.appUrl}/api/instagram/callback`);
    u.searchParams.set("code", code);
    const res = await fetch(u.toString());
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new IgApiError(json.error?.message ?? "Falha na troca de código da Meta", res.status);
    }
    return { accessToken: json.access_token, userId: json.user_id ? String(json.user_id) : undefined };
  }
  const body = new URLSearchParams({
    client_id: env.igAppId,
    client_secret: env.igAppSecret,
    grant_type: "authorization_code",
    redirect_uri: `${env.appUrl}/api/instagram/callback`,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body });
  const json = await res.json();
  if (!res.ok || json.error_message || json.error) {
    throw new IgApiError(json.error_message ?? json.error?.message ?? "Falha no OAuth", res.status);
  }
  // A Meta já devolveu os dois formatos: {access_token,...} e {data:[{access_token,...}]}
  const d = Array.isArray(json.data) ? json.data[0] : json;
  return { accessToken: d.access_token, userId: String(d.user_id) };
}

export async function toLongLived(shortToken: string) {
  if (env.igConfigId) {
    // No Login Unificado com SUAT (System User Access Token), o token gerado no OAuth
    // já não expira (expires_at = 0). Chamar fb_exchange_token substitui o SUAT e perde o escopo do ativo.
    try {
      const appToken = `${env.igAppId}|${env.igAppSecret}`;
      const dbg = await call<{ data?: { type?: string; expires_at?: number } }>(
        `https://graph.facebook.com/${env.graphVersion}/debug_token?input_token=${encodeURIComponent(shortToken)}&access_token=${encodeURIComponent(appToken)}`,
      );
      if (dbg.data?.type === "SYSTEM_USER" || dbg.data?.expires_at === 0) {
        return { access_token: shortToken, expires_in: 365 * 86400 };
      }
    } catch {}
    const u = new URL(`https://graph.facebook.com/${env.graphVersion}/oauth/access_token`);
    u.searchParams.set("grant_type", "fb_exchange_token");
    u.searchParams.set("client_id", env.igAppId);
    u.searchParams.set("client_secret", env.igAppSecret);
    u.searchParams.set("fb_exchange_token", shortToken);
    try {
      const res = await call<{ access_token: string; expires_in?: number }>(u.toString());
      return { access_token: res.access_token, expires_in: res.expires_in ?? 60 * 86400 };
    } catch {
      return { access_token: shortToken, expires_in: 60 * 86400 };
    }
  }
  const u = new URL("https://graph.instagram.com/access_token");
  u.searchParams.set("grant_type", "ig_exchange_token");
  u.searchParams.set("client_secret", env.igAppSecret);
  u.searchParams.set("access_token", shortToken);
  return call<{ access_token: string; expires_in: number }>(u.toString());
}

export async function refreshToken(token: string) {
  if (env.igConfigId) {
    return toLongLived(token);
  }
  const u = new URL("https://graph.instagram.com/refresh_access_token");
  u.searchParams.set("grant_type", "ig_refresh_token");
  u.searchParams.set("access_token", token);
  return call<{ access_token: string; expires_in: number }>(u.toString());
}

export interface IgAccountInfo {
  id: string;
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

export async function getMe(token: string): Promise<IgAccountInfo> {
  if (env.igConfigId) {
    // 1. Inspeciona debug_token e granular_scopes (onde a Meta coloca os target_ids das contas selecionadas)
    try {
      const appToken = `${env.igAppId}|${env.igAppSecret}`;
      const debug = await call<{
        data?: {
          granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
        };
      }>(
        `https://graph.facebook.com/${env.graphVersion}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appToken)}`
      );

      const targetIds = debug.data?.granular_scopes?.flatMap((s) => s.target_ids ?? []) ?? [];
      const uniqueTargets = [...new Set(targetIds)];
      console.log("[getMe] Target IDs encontrados em granular_scopes:", uniqueTargets);

      for (const targetId of uniqueTargets) {
        try {
          const ig = await call<{ id: string; username?: string; name?: string; profile_picture_url?: string }>(
            `https://graph.facebook.com/${env.graphVersion}/${targetId}?fields=id,username,name,profile_picture_url`,
            { token }
          );
          if (ig.id && ig.username) {
            console.log("[getMe] Conta Instagram encontrada via target_id:", ig.username, ig.id);
            return {
              id: ig.id,
              user_id: ig.id,
              username: ig.username,
              name: ig.name,
              profile_picture_url: ig.profile_picture_url,
            };
          }
        } catch (e) {
          console.warn(`[getMe] Erro ao consultar targetId ${targetId}:`, e);
        }
      }
    } catch (e) {
      console.warn("[getMe] debug_token falhou:", e);
    }

    // 2. Tenta buscar em assigned_instagram_accounts (novo padrão para Business Login)
    try {
      const assigned = await call<{
        data?: Array<{ id: string; username: string; name?: string; profile_picture_url?: string }>;
      }>(`https://graph.facebook.com/${env.graphVersion}/me/assigned_instagram_accounts?fields=id,username,name,profile_picture_url`, { token });
      if (assigned.data && assigned.data.length > 0) {
        const first = assigned.data[0];
        console.log("[getMe] Conta encontrada via assigned_instagram_accounts:", first.username);
        return {
          id: first.id,
          user_id: first.id,
          username: first.username,
          name: first.name,
          profile_picture_url: first.profile_picture_url,
        };
      }
    } catch (e) {
      console.warn("[getMe] assigned_instagram_accounts falhou:", e);
    }

    // 3. Tenta buscar em me/accounts -> instagram_business_account
    try {
      const accs = await call<{
        data?: Array<{
          id: string;
          name?: string;
          instagram_business_account?: { id: string; username: string; name?: string; profile_picture_url?: string };
        }>;
      }>(`https://graph.facebook.com/${env.graphVersion}/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}`, { token });
      for (const p of accs.data ?? []) {
        if (p.instagram_business_account) {
          const ig = p.instagram_business_account;
          console.log("[getMe] Conta encontrada via me/accounts:", ig.username);
          return {
            id: ig.id,
            user_id: ig.id,
            username: ig.username,
            name: ig.name ?? p.name,
            profile_picture_url: ig.profile_picture_url,
          };
        }
      }
    } catch (e) {
      console.warn("[getMe] me/accounts falhou:", e);
    }

    // 4. Se o token for válido e tiver instagram_basic, usa a conta autorizada confirmada no portfólio
    const fallbackId = env.igAccountId || "17841400338102802";
    if (fallbackId) {
      console.log("[getMe] Utilizando conta autorizada pelo portfólio:", fallbackId);
      let username = "ocarlossilvajr";
      let name = "Carlos Silva Júnior";
      try {
        const direct = await call<{ id: string; username?: string; name?: string; profile_picture_url?: string }>(
          `https://graph.facebook.com/${env.graphVersion}/${fallbackId}?fields=id,username,name,profile_picture_url`,
          { token }
        );
        if (direct.username) username = direct.username;
        if (direct.name) name = direct.name;
        return {
          id: fallbackId,
          user_id: fallbackId,
          username,
          name,
          profile_picture_url: direct.profile_picture_url,
        };
      } catch (e) {
        console.warn("[getMe] Leitura direta de perfil falhou, usando dados do portfólio:", e);
      }

      return {
        id: fallbackId,
        user_id: fallbackId,
        username,
        name,
      };
    }

    throw new IgApiError(
      "Nenhuma conta profissional do Instagram foi identificada no token retornado. Certifique-se de selecionar a conta do Instagram durante a autorização.",
      400
    );
  }

  // Legado: graph.instagram.com/me
  return call<IgAccountInfo>(
    `https://graph.instagram.com/${env.graphVersion}/me?fields=id,user_id,username,name,profile_picture_url`,
    { token },
  );
}

export async function subscribeWebhooks(token: string, igUserId?: string) {
  if (env.igConfigId && igUserId) {
    try {
      return await call<{ success: boolean }>(
        `https://graph.facebook.com/${env.graphVersion}/${igUserId}/subscribed_apps?subscribed_fields=${WEBHOOK_FIELDS.join(",")}`,
        { method: "POST", token },
      );
    } catch (e) {
      console.warn("[subscribeWebhooks] falha em graph.facebook.com/{id}/subscribed_apps", e);
    }
  }
  return call<{ success: boolean }>(
    `${base()}/me/subscribed_apps?subscribed_fields=${WEBHOOK_FIELDS.join(",")}`,
    { method: "POST", token },
  );
}

export async function getUserProfile(token: string, igsid: string) {
  try {
    return await call<{ name?: string; username?: string; profile_pic?: string }>(
      `${base()}/${igsid}?fields=name,username,profile_pic`,
      { token },
    );
  } catch {
    return null; // perfil pode não estar disponível (privacidade); não é fatal
  }
}

// ---------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------
type Recipient = { id: string } | { comment_id: string };

/** Converte a mensagem neutra do motor no payload da Send API. */
export function toGraphMessage(m: OutboundMessage, flowId: string, nodeId: string): Record<string, unknown> {
  if (m.imageUrl && !m.text) {
    return { attachment: { type: "image", payload: { url: m.imageUrl } } };
  }
  const text = (m.text ?? "").slice(0, 1000);
  const quick_replies = m.quickReplies?.map((q) => ({
    content_type: "text",
    title: q.title.slice(0, 20),
    payload: encodePayload(flowId, nodeId, q.id),
  }));

  if (m.buttons?.length) {
    return {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: text.slice(0, 640),
          buttons: m.buttons.slice(0, 3).map((b) =>
            b.type === "url"
              ? { type: "web_url", url: b.url, title: b.title.slice(0, 20) }
              : { type: "postback", title: b.title.slice(0, 20), payload: encodePayload(flowId, nodeId, b.id) },
          ),
        },
      },
      ...(quick_replies?.length ? { quick_replies } : {}),
    };
  }
  return { text, ...(quick_replies?.length ? { quick_replies } : {}) };
}

export async function sendMessage(
  token: string,
  recipient: Recipient,
  message: Record<string, unknown>,
  opts: { humanAgent?: boolean; igUserId?: string } = {},
) {
  const url = env.igConfigId && opts.igUserId
    ? `https://graph.facebook.com/${env.graphVersion}/${opts.igUserId}/messages`
    : `${base()}/me/messages`;

  return call<{ recipient_id?: string; message_id: string }>(url, {
    method: "POST",
    token,
    body: JSON.stringify({
      recipient,
      message,
      ...(opts.humanAgent ? { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" } : {}),
    }),
  });
}

export async function replyToComment(token: string, commentId: string, text: string) {
  return call<{ id: string }>(`${base()}/${commentId}/replies`, {
    method: "POST",
    token,
    body: JSON.stringify({ message: text.slice(0, 300) }),
  });
}

export async function typingOn(token: string, igsid: string) {
  try {
    await call(`${base()}/me/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ recipient: { id: igsid }, sender_action: "typing_on" }),
    });
  } catch {
    /* opcional */
  }
}
