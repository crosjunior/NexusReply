import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Service role — ignora RLS. Só para webhooks, worker e rotas internas.
 * Pode usar SUPABASE_INTERNAL_URL (rede interna). O cliente com sessão de usuário
 * NÃO pode: o nome do cookie de auth deriva do host da URL pública.
 */
export function admin(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseInternalUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
