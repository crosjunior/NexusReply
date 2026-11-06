/** Leitura centralizada das variáveis de ambiente (falha cedo e com mensagem clara). */
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export const env = {
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get supabaseUrl() {
    return req("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return req("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /** URL interna (rede Docker/VPC) usada só pelo cliente service-role. Opcional. */
  get supabaseInternalUrl() {
    return process.env.SUPABASE_INTERNAL_URL || req("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return req("SUPABASE_SERVICE_ROLE_KEY");
  },
  get igAppId() {
    return req("INSTAGRAM_APP_ID");
  },
  get igAppSecret() {
    return req("INSTAGRAM_APP_SECRET");
  },
  get igConfigId() {
    return process.env.INSTAGRAM_CONFIG_ID;
  },
  get igAccountId() {
    return process.env.INSTAGRAM_ACCOUNT_ID;
  },
  get igVerifyToken() {
    return req("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
  },
  get waVerifyToken() {
    return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? "";
  },
  get waAppSecret() {
    return process.env.WHATSAPP_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET ?? "";
  },
  get graphVersion() {
    return process.env.INSTAGRAM_GRAPH_VERSION ?? "v24.0";
  },
  get tokenKey() {
    return req("TOKEN_ENCRYPTION_KEY");
  },
  get cronSecret() {
    return req("CRON_SECRET");
  },
  get maxSendsPerHour() {
    return Number(process.env.MAX_SENDS_PER_HOUR ?? 190);
  },
  get openaiKey() {
    return process.env.OPENAI_API_KEY;
  },
  get openaiBaseUrl() {
    return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  },
  get openaiModel() {
    return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  },
};
