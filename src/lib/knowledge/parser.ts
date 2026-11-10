import type { DocumentSourceType } from "./types";

export interface ParsedDocumentResult {
  title: string;
  sourceType: DocumentSourceType;
  contentJson: Record<string, unknown>;
  chunks: Array<{
    content: string;
    metadata: Record<string, unknown>;
  }>;
}

/**
 * Converte o contedo bruto ou enviado para uma estrutura limpa em JSON
 * e particiona em trechos (chunks) ideais para recuperao semntica e textual.
 */
export function parseAndChunkContent(
  title: string,
  sourceType: DocumentSourceType,
  rawContent: string,
  extraMeta: Record<string, unknown> = {}
): ParsedDocumentResult {
  const clean = rawContent.trim();
  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sections: Array<{ heading?: string; text: string }> = [];
  let currentHeading = title;
  let currentBuffer: string[] = [];

  for (const p of paragraphs) {
    if (p.startsWith("#") || p.length < 60 && p.endsWith(":")) {
      if (currentBuffer.length > 0) {
        sections.push({ heading: currentHeading, text: currentBuffer.join("\n\n") });
        currentBuffer = [];
      }
      currentHeading = p.replace(/^#+\s*/, "").replace(/:$/, "").trim();
    } else {
      currentBuffer.push(p);
    }
  }

  if (currentBuffer.length > 0) {
    sections.push({ heading: currentHeading, text: currentBuffer.join("\n\n") });
  }

  // Gera o documento estruturado em JSON
  const contentJson = {
    title,
    source_type: sourceType,
    imported_at: new Date().toISOString(),
    total_characters: clean.length,
    total_sections: sections.length,
    metadata: extraMeta,
    sections: sections.map((s, idx) => ({
      index: idx + 1,
      heading: s.heading,
      content: s.text,
      word_count: s.text.split(/\s+/).length,
    })),
  };

  // Cria chunks de 400 a 1000 caracteres com sobreposio suave
  const chunks: Array<{ content: string; metadata: Record<string, unknown> }> = [];

  for (const s of sections) {
    const text = s.text;
    const maxChunk = 800;
    if (text.length <= maxChunk) {
      chunks.push({
        content: s.heading !== title ? `[${s.heading}]\n${text}` : text,
        metadata: {
          title,
          source_type: sourceType,
          section: s.heading,
          ...extraMeta,
        },
      });
    } else {
      // Divide em subchunks
      const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
      let buf = "";
      for (const sent of sentences) {
        if ((buf + sent).length > maxChunk && buf.trim().length > 100) {
          chunks.push({
            content: s.heading !== title ? `[${s.heading}]\n${buf.trim()}` : buf.trim(),
            metadata: {
              title,
              source_type: sourceType,
              section: s.heading,
              ...extraMeta,
            },
          });
          buf = sent;
        } else {
          buf += " " + sent;
        }
      }
      if (buf.trim()) {
        chunks.push({
          content: s.heading !== title ? `[${s.heading}]\n${buf.trim()}` : buf.trim(),
          metadata: {
            title,
            source_type: sourceType,
            section: s.heading,
            ...extraMeta,
          },
        });
      }
    }
  }

  if (chunks.length === 0 && clean) {
    chunks.push({
      content: clean.slice(0, 1000),
      metadata: { title, source_type: sourceType, ...extraMeta },
    });
  }

  return {
    title,
    sourceType,
    contentJson,
    chunks,
  };
}

