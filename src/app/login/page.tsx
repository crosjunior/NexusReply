"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Mail, Lock, Building2 } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
      setGoogleLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { workspace_name: workspace || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) return setMsg({ type: "error", text: error.message });
      if (!data.session) {
        return setMsg({
          type: "info",
          text: "Enviamos um e-mail de confirmação. Por favor verifique sua caixa de entrada para ativar seus 20 dias de teste.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ type: "error", text: "E-mail ou senha incorretos." });
    }

    const next = params.get("next") ?? "/app";
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-zinc-50 via-white to-brand-50/20 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <div className="text-3xl font-extrabold tracking-tight text-zinc-900">
            <span className="text-brand-600">Nexus</span>Reply
          </div>
        </Link>
        <p className="mt-2 text-sm text-zinc-600">
          Automação com IA para Instagram e WhatsApp
        </p>

        {/* Badge de 20 Dias Grátis */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200/60 shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Teste grátis por 20 dias • Sem cartão
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-6 sm:p-8 shadow-xl border border-zinc-200/80">
          {/* Alternador de Abas: Entrar vs Cadastrar */}
          <div className="flex rounded-lg bg-zinc-100 p-1 mb-6 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMsg(null);
              }}
              className={`flex-1 rounded-md py-2 text-center font-medium transition-all ${
                mode === "login"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMsg(null);
              }}
              className={`flex-1 rounded-md py-2 text-center font-medium transition-all ${
                mode === "signup"
                  ? "bg-white text-brand-700 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Criar Conta Grátis
            </button>
          </div>

          {/* Botão de Login com o Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {googleLoading ? "Conectando ao Google…" : "Continuar com o Google"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-400">ou com e-mail e senha</span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  Nome da sua Empresa ou Marca
                </label>
                <input
                  className="input"
                  required
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  placeholder="Ex: Carlos Treinamentos"
                />
              </div>
            )}

            <div>
              <label className="label flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                E-mail
              </label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                Senha
              </label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>

            {msg && (
              <div
                className={`rounded-lg p-3 text-xs font-medium ${
                  msg.type === "error"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-brand-50 text-brand-800 border border-brand-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-sm font-semibold shadow-md"
              disabled={loading || googleLoading}
            >
              {loading
                ? "Processando…"
                : mode === "login"
                ? "Acessar Plataforma"
                : "Criar Conta & Iniciar Teste (20 Dias Grátis)"}
            </button>
          </form>

          {/* Vantagens do Plano Gratuito de Teste */}
          {mode === "signup" && (
            <div className="mt-6 rounded-lg bg-zinc-50 p-3.5 border border-zinc-200/70 text-xs text-zinc-600 space-y-1.5">
              <div className="font-semibold text-zinc-800 mb-1">Incluso nos seus 20 dias de teste:</div>
              <div className="flex items-center gap-2 text-zinc-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                1 Fluxo completo de automação (Comentário → DM)
              </div>
              <div className="flex items-center gap-2 text-zinc-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                1 Conta profissional do Instagram conectada
              </div>
              <div className="flex items-center gap-2 text-zinc-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Agentes com Inteligência Artificial e Base de Conhecimento
              </div>
              <div className="flex items-center gap-2 text-zinc-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Sem cobrança surpresa e sem necessidade de cartão
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-zinc-500">
            {mode === "login" ? (
              <span>
                Novo por aqui?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-brand-600 hover:text-brand-700 underline"
                >
                  Crie sua conta grátis por 20 dias
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-semibold text-brand-600 hover:text-brand-700 underline"
                >
                  Entrar na sua conta
                </button>
              </span>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Ao se cadastrar, você concorda com os Termos de Uso e Política de Privacidade do NexusReply.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
