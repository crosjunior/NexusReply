"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

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
      if (!data.session) return setMsg({ type: "info", text: "Enviamos um link de confirmação para o seu e-mail." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ type: "error", text: "E-mail ou senha inválidos." });
    }
    const next = params.get("next") ?? "/app";
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/app");
    router.refresh();
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold">
            <span className="text-brand-600">Reply</span>Flow
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{mode === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}</p>
        </div>
        {mode === "signup" && (
          <div>
            <label className="label">Nome da empresa ou marca</label>
            <input className="input" value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="Minha Marca" />
          </div>
        )}
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && (
          <p className={`rounded-lg px-3 py-2 text-sm ${msg.type === "error" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>{msg.text}</p>
        )}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        <button
          type="button"
          className="w-full text-center text-sm text-zinc-500 hover:text-zinc-800"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
