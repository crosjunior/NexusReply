import { env } from "../env";

/**
 * Gera resposta com qualquer API compatível com OpenAI (OpenAI, Azure, Groq,
 * OpenRouter, Ollama...). Sem chave configurada, devolve fallback.
 */
export async function generateReply(opts: {
  systemPrompt: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const key = env.openaiKey;
  if (!key) return "Recebi sua mensagem! Em instantes alguém do time te responde. 🙂";

  const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: env.openaiModel,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            `${opts.systemPrompt}\n\nRegras: responda em até 3 frases curtas, sem markdown, ` +
            `adequado para direct do Instagram (máx. 900 caracteres).`,
        },
        ...opts.history.slice(-12),
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";
  return text.trim().slice(0, 950) || "Desculpe, não consegui responder agora.";
}
