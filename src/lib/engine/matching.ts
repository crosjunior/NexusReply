import type { MatchMode, TriggerConfig, TriggerType } from "./types";

/** Normaliza: minúsculas, sem acento, espaços colapsados */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesKeywords(text: string, keywords: string[], mode: MatchMode): boolean {
  if (mode === "any") return true;
  const t = normalize(text);
  if (!t) return false;
  return keywords
    .map(normalize)
    .filter(Boolean)
    .some((k) => {
      if (mode === "exact") return t === k;
      // "contains" por palavra inteira, evita "eu" casar com "europa"
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(k)}($|[^\\p{L}\\p{N}])`, "u");
      return re.test(t);
    });
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface TriggerRow {
  id: string;
  flow_id: string;
  type: TriggerType;
  config: Partial<TriggerConfig>;
  priority: number;
}

/**
 * Verifica se a regra está dentro do período de vigência.
 */
export function isScheduleActive(config: Partial<TriggerConfig>, now = new Date()): boolean {
  if (config.scheduleType !== "scheduled") return true;
  if (config.startsAt) {
    const start = new Date(config.startsAt);
    if (!isNaN(start.getTime()) && now < start) return false;
  }
  if (config.endsAt) {
    const end = new Date(config.endsAt);
    if (!isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

/**
 * Escolhe o gatilho vencedor. Ordem:
 * 1. Vigência ativa (ignora se estiver fora do período de início/fim)
 * 2. Mídia específica tem prioridade estrita sobre qualquer publicação
 * 3. Palavra-chave específica sobre 'any'
 * 4. Maior prioridade numérica
 */
export function pickTrigger(
  triggers: TriggerRow[],
  type: TriggerType,
  text: string,
  opts: { mediaId?: string } = {},
): TriggerRow | null {
  const candidates = triggers
    .filter((t) => t.type === type)
    .filter((t) => isScheduleActive(t.config))
    .filter((t) => {
      const ids = t.config.mediaIds ?? [];
      return !opts.mediaId || ids.length === 0 || ids.includes(opts.mediaId);
    })
    .filter((t) => {
      if (type === "default_reply" || type === "story_mention") return true;
      return matchesKeywords(text, t.config.keywords ?? [], t.config.match ?? "contains");
    })
    .sort((a, b) => {
      // Prioridade 1: Mídia específica sobre "qualquer publicação"
      const ma = (a.config.mediaIds ?? []).length ? 1 : 0;
      const mb = (b.config.mediaIds ?? []).length ? 1 : 0;
      if (ma !== mb) return mb - ma;

      // Prioridade 2: Palavra-chave específica sobre match 'any'
      const sa = (a.config.match ?? "contains") === "any" ? 0 : 1;
      const sb = (b.config.match ?? "contains") === "any" ? 0 : 1;
      if (sa !== sb) return sb - sa;

      return b.priority - a.priority;
    });
  return candidates[0] ?? null;
}
