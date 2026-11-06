import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** Chave de 32 bytes derivada de TOKEN_ENCRYPTION_KEY (base64 ou texto). */
function key(): Buffer {
  const raw = env.tokenKey;
  const b = Buffer.from(raw, "base64");
  if (b.length === 32) return b;
  return createHmac("sha256", "replyflow").update(raw).digest();
}

/** AES-256-GCM → "iv.tag.ciphertext" (base64url) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Valida X-Hub-Signature-256 enviado pela Meta. */
export function verifyMetaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

/** state do OAuth assinado (evita CSRF e amarra ao workspace). */
export function signState(data: Record<string, string>): string {
  const body = Buffer.from(JSON.stringify({ ...data, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readState(state: string, maxAgeMs = 15 * 60_000): Record<string, string> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (Date.now() - Number(data.t) > maxAgeMs) return null;
  return data;
}
