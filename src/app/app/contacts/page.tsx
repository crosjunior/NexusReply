import { requireSession } from "@/lib/supabase/server";
import { TagEditor } from "@/components/TagEditor";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const { q, tag } = await searchParams;
  const { supabase, workspaceId } = await requireSession();

  let query = supabase
    .from("contacts")
    .select("id, username, name, profile_pic, tags, fields, last_interaction_at, created_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("last_interaction_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%,()]/g, "")}%,name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (tag) query = query.contains("tags", [tag]);
  const { data: contacts, count } = await query;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-sm text-zinc-500">{count ?? 0} contatos</p>
        </div>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Buscar por @usuário ou nome" />
        <input name="tag" defaultValue={tag} className="input max-w-40" placeholder="Filtrar por tag" />
        <button className="btn-secondary">Filtrar</button>
      </form>

      <div className="card divide-y divide-zinc-100">
        {(contacts ?? []).length === 0 && <p className="p-6 text-center text-sm text-zinc-500">Nenhum contato ainda. Eles aparecem quando alguém comenta ou envia DM.</p>}
        {(contacts ?? []).map((c) => (
          <div key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {c.profile_pic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.profile_pic} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700">
                  {(c.username ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">@{c.username ?? "—"}</div>
                <div className="truncate text-xs text-zinc-500">
                  {c.name}
                  {Object.entries((c.fields as Record<string, unknown>) ?? {})
                    .slice(0, 3)
                    .map(([k, v]) => ` · ${k}: ${String(v)}`)
                    .join("")}
                </div>
              </div>
            </div>
            <TagEditor id={c.id} tags={c.tags ?? []} />
            <div className="text-xs text-zinc-400 sm:w-28 sm:text-right">
              {c.last_interaction_at ? new Date(c.last_interaction_at).toLocaleDateString("pt-BR") : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
