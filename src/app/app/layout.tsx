import { requireSession } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { signOut } from "./actions";
import { Clock, AlertTriangle, ShieldCheck, Lock } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { workspaceName, user, workspace } = await requireSession();

  // Se o usuário estiver bloqueado pelo administrador
  if (workspace.isBlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="card max-w-md p-8 shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-zinc-900">Acesso Suspenso</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sua conta está suspensa temporariamente pelo administrador do sistema.
          </p>
          <div className="mt-6 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-500 font-mono">
            ID: {workspace.id}
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Para reativar seu acesso, entre em contato com <span className="font-semibold text-zinc-800">carlos@conexaoagil.com.br</span>
          </p>
          <form action={signOut} className="mt-6">
            <button className="btn-secondary w-full">Sair da Conta</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold flex items-center justify-between">
            <div>
              <span className="text-brand-600">Nexus</span>Reply
            </div>
            {workspace.isSuperAdmin && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                ADMIN
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs text-zinc-500">{workspaceName}</div>
        </div>

        <Nav variant="side" isAdmin={workspace.isSuperAdmin} />

        <div className="mt-auto border-t border-zinc-200 p-4">
          <div className="truncate text-xs text-zinc-500">{user.email}</div>
          <form action={signOut}>
            <button className="mt-2 text-xs text-zinc-600 hover:text-zinc-900">Sair</button>
          </form>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col">
        {/* Banner de Período de Teste Gratuito */}
        {!workspace.isUnlimited && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b ${
              workspace.isTrialExpired
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {workspace.isTrialExpired ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Período de teste gratuito expirado.</strong> Seus fluxos existentes continuam salvos. Para desbloquear novos fluxos e WhatsApp, fale com o administrador.
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    Período de Teste Gratuito: <strong>{workspace.daysLeft} dias restantes</strong> (limite: 1 fluxo • 1 conta Instagram).
                  </span>
                </>
              )}
            </div>
            <a
              href="mailto:carlos@conexaoagil.com.br?subject=Upgrade%20NexusReply%20-%20Plano%20VIP"
              className="ml-3 shrink-0 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 shadow-xs hover:bg-zinc-100 border border-zinc-200"
            >
              Liberar Ilimitado
            </a>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </main>

      <Nav variant="bottom" isAdmin={workspace.isSuperAdmin} />
    </div>
  );
}
