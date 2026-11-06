import Link from "next/link";
import { MessageCircle, MessagesSquare, Workflow, Zap } from "lucide-react";

export default function Home() {
  const features = [
    { icon: MessageCircle, title: "Comentário → DM", text: "Quem comenta a palavra-chave recebe o link no direct, com resposta pública automática." },
    { icon: Workflow, title: "Fluxos visuais", text: "Mensagens, botões, perguntas, condições, tags, delays e IA — arrastando blocos." },
    { icon: MessagesSquare, title: "Inbox com humano", text: "Assuma a conversa a qualquer momento; o bot pausa sozinho." },
    { icon: Zap, title: "100% API oficial", text: "Instagram API da Meta, dentro das regras de janela de 24h e limites de envio." },
  ];
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold">
          <span className="text-brand-600">Reply</span>Flow
        </span>
        <Link href="/login" className="btn-secondary">Entrar</Link>
      </header>
      <section className="py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Automatize DMs e comentários do Instagram
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-600">
          Crie fluxos de resposta como no ManyChat, conecte sua conta profissional e comece a converter comentários em conversas.
        </p>
        <Link href="/login?mode=signup" className="btn-primary mt-8 px-6 py-3 text-base">Começar grátis</Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card p-5">
            <f.icon className="h-5 w-5 text-brand-600" />
            <h3 className="mt-3 font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-zinc-600">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
