"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Users, Workflow, BookOpen, Bot, ShieldCheck, MessageSquare } from "lucide-react";

const baseItems = [
  { href: "/app", label: "Início", icon: Home, exact: true },
  { href: "/app/flows", label: "Fluxos", icon: Workflow },
  { href: "/app/agents", label: "Agentes IA", icon: Bot },
  { href: "/app/knowledge", label: "Conhecimento", icon: BookOpen },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/contacts", label: "Contatos", icon: Users },
  { href: "/app/settings", label: "Conexões", icon: MessageSquare },
];

export function Nav({ variant, isAdmin }: { variant: "side" | "bottom"; isAdmin?: boolean }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));

  const items = isAdmin
    ? [...baseItems, { href: "/app/admin", label: "Administração", icon: ShieldCheck }]
    : baseItems;

  if (variant === "bottom") {
    // esconde no builder para liberar a tela
    if (/^\/app\/flows\/.+/.test(path)) return null;
    const mobileItems = [
      items[0], // Início
      items[1], // Fluxos
      items[2], // Agentes IA
      items[3], // Conhecimento
      items[4], // Inbox
    ];
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-zinc-200 bg-white md:hidden">
        {mobileItems.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active(i.href, i.exact) ? "text-brand-600 font-medium" : "text-zinc-500"}`}
          >
            <i.icon className="h-4 w-4" />
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-0.5 px-3">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
            active(i.href, i.exact) ? "bg-brand-50 font-medium text-brand-700" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <i.icon className="h-4 w-4" />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
