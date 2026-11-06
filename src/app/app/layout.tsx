import { requireSession } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { workspaceName, user } = await requireSession();
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold">
            <span className="text-brand-600">Reply</span>Flow
          </div>
          <div className="mt-0.5 truncate text-xs text-zinc-500">{workspaceName}</div>
        </div>
        <Nav variant="side" />
        <div className="mt-auto border-t border-zinc-200 p-4">
          <div className="truncate text-xs text-zinc-500">{user.email}</div>
          <form action={signOut}>
            <button className="mt-2 text-xs text-zinc-600 hover:text-zinc-900">Sair</button>
          </form>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <Nav variant="bottom" />
    </div>
  );
}
