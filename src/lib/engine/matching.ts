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
 * Escolhe o gatilho vencedor. Ordem: tipo exato > palavra-chave específica > "any",
 * depois prioridade (maior primeiro).
 */
export function pickTrigger(
  triggers: TriggerRow[],
  type: TriggerType,
  text: string,
  opts: { mediaId?: string } = {},
): TriggerRow | null {
  const candidates = triggers
    .filter((t) => t.type === type)
    .filter((t) => {
      const ids = t.config.mediaIds ?? [];
      return !opts.mediaId || ids.length === 0 || ids.includes(opts.mediaId);
    })
    .filter((t) => {
      if (type === "default_reply" || type === "story_mention") return true;
      return matchesKeywords(text, t.config.keywords ?? [], t.config.match ?? "contains");
    })
    .sort((a, b) => {
      const sa = (a.config.match ?? "contains") === "any" ? 0 : 1;
      const sb = (b.config.match ?? "contains") === "any" ? 0 : 1;
      if (sa !== sb) return sb - sa;
      const ma = (a.config.mediaIds ?? []).length ? 1 : 0;
      const mb = (b.config.mediaIds ?? []).length ? 1 : 0;
      if (ma !== mb) return mb - ma;
      return b.priority - a.priority;
    });
  return candidates[0] ?? null;
}
