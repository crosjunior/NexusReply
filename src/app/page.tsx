import Link from "next/link";
import {
  MessageSquare,
  Workflow,
  Sparkles,
  Zap,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Bot,
  BookOpen,
  Users,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  FileText,
  Share2,
} from "lucide-react";

export default function Home() {
  const benefits = [
    {
      icon: Workflow,
      badge: "ManyChat-Style Pro",
      title: "Automação de Comentários & DMs no Instagram",
      desc: "Quando o seguidor comenta palavras como 'QUERO' ou 'LINK' em qualquer Post, Reels ou Story específico, o NexusReply responde publicamente no post e envia o Direct imediatamente.",
    },
    {
      icon: Bot,
      badge: "Inteligência Artificial RAG",
      title: "Agentes de IA Treinados nos seus Arquivos",
      desc: "Faça upload de PDFs, planilhas Excel, Word, arquivos TXT ou links de sites. O agente lê seus documentos e responde qualquer dúvida de clientes no Direct ou WhatsApp com precisão cirúrgica.",
    },
    {
      icon: MessageSquare,
      badge: "Multi-Canal Integrado",
      title: "WhatsApp Oficial & Conexão por QR Code",
      desc: "Conecte seu WhatsApp instantaneamente via QR Code (Evolution / NexusCRM) ou via API Oficial Meta Cloud. Unifique todas as conversas em uma única caixa de entrada inteligente.",
    },
    {
      icon: Calendar,
      badge: "Sincronização Total",
      title: "Agendamentos com Google Meet & Teams",
      desc: "O robô consulta seus horários livres no Google Calendar ou Outlook e agenda a reunião direto na conversa, gerando o link da videochamada no Meet ou Teams automaticamente.",
    },
    {
      icon: TrendingUp,
      badge: "Analytics em Tempo Real",
      title: "Métricas de Execução & Indicadores de Leads",
      desc: "Acompanhe comentários recebidos, taxa de resposta, % de seguidores vs não seguidores, contatos capturados e histórico completo de mensagens em painéis visuais.",
    },
    {
      icon: ShieldCheck,
      badge: "Transição Suave",
      title: "Inbox com Assunção Humana",
      desc: "Assuma qualquer conversa no momento em que desejar. O robô pausa sozinho para não atrapalhar seu atendimento e retoma se você solicitar.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Conecte suas Contas",
      desc: "Autorize seu Instagram Profissional em 1 clique e pareie seu WhatsApp via QR Code em segundos.",
    },
    {
      num: "02",
      title: "Configure seu Fluxo & IA",
      desc: "Escolha posts específicos, defina palavras-chave e anexe sua Base de Conhecimento com PDFs ou links.",
    },
    {
      num: "03",
      title: "Venda no Automático",
      desc: "Deixe o NexusReply engajar seguidores 24/7, responder dúvidas, capturar contatos e fechar agendamentos.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-brand-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md shadow-brand-500/20 font-black text-lg">
              N
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-brand-600">Nexus</span>Reply
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <a href="#recursos" className="hover:text-brand-600 transition-colors">
              Recursos
            </a>
            <a href="#como-funciona" className="hover:text-brand-600 transition-colors">
              Como Funciona
            </a>
            <a href="#ia-conhecimento" className="hover:text-brand-600 transition-colors">
              Agentes IA
            </a>
            <a href="#vantagens" className="hover:text-brand-600 transition-colors">
              Diferenciais
            </a>
            <a href="#teste-gratis" className="hover:text-brand-600 transition-colors">
              Planos & Teste
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 px-3 py-1.5"
            >
              Entrar
            </Link>
            <Link
              href="/login?mode=signup"
              className="btn-primary text-xs sm:text-sm px-4 py-2 shadow-md shadow-brand-600/25 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Testar 20 Dias Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.brand.100),white)] opacity-60"></div>
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-xs">
            <Sparkles className="h-4 w-4 text-brand-600" /> Plataforma All-in-One Oficial da Meta
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl text-zinc-950">
            Automatize DMs e Comentários no{" "}
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Instagram & WhatsApp
            </span>{" "}
            com IA
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 leading-relaxed">
            Converta comentários em conversas privadas no Direct, tire dúvidas 24/7 com Agentes de IA treinados na sua base de conhecimento e agende reuniões no Google Meet e Teams automaticamente.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2"
            >
              Começar Teste Grátis (20 Dias)
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              className="btn-secondary w-full sm:w-auto px-6 py-3.5 text-base font-semibold"
            >
              Ver Demonstração
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 20 dias grátis por cadastro
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sem necessidade de cartão
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> API Oficial da Meta
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Configuração em 2 minutos
            </span>
          </div>

          {/* Mockup Interativo / Visual Preview */}
          <div className="mt-14 relative mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl sm:p-5">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 sm:p-6 text-left">
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                  <span className="ml-2 text-xs font-semibold text-zinc-500">
                    Fluxo de Exemplo: Post Reels → Resposta IA → Link & Agendamento
                  </span>
                </div>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Ao Vivo
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Etapa 1 */}
                <div className="card p-4 bg-white border border-zinc-200/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-brand-600 mb-1">
                    1. Gatilho no Instagram
                  </div>
                  <p className="text-xs text-zinc-800 font-medium">
                    Usuário comenta: <span className="font-bold text-brand-700">&quot;quero&quot;</span> no seu Reels ou Post.
                  </p>
                  <div className="mt-3 rounded-md bg-zinc-50 p-2 text-[11px] text-zinc-500">
                    ✓ Resposta pública: <em>&quot;Te mandei no direct! 📩&quot;</em>
                  </div>
                </div>

                {/* Etapa 2 */}
                <div className="card p-4 bg-white border border-brand-200 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                    2. Envio no Direct (DM)
                  </div>
                  <p className="text-xs text-zinc-800 font-medium">
                    Mensagem privada imediata com botão interativo e saudação personalizada com o primeiro nome.
                  </p>
                  <div className="mt-3 rounded-md bg-brand-50/60 p-2 text-[11px] text-brand-800">
                    <em>&quot;Oi Carlos! Vi seu comentário. Toque abaixo para receber.&quot;</em>
                  </div>
                </div>

                {/* Etapa 3 */}
                <div className="card p-4 bg-white border border-zinc-200/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                    3. Agente de IA & Agenda
                  </div>
                  <p className="text-xs text-zinc-800 font-medium">
                    A IA responde dúvidas com base nos PDFs anexados e agenda a reunião gerando o link do Google Meet.
                  </p>
                  <div className="mt-3 rounded-md bg-emerald-50 p-2 text-[11px] text-emerald-800">
                    ✓ Reunião agendada com Google Meet sincronizado
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona em 3 Passos */}
      <section id="como-funciona" className="border-t border-zinc-200/80 bg-zinc-50/50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">Simples & Rápido</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950">
              Como funciona em 3 passos
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">
              Sem códigos complexos. Conecte, desenhe suas automações e coloque seu negócio para vender no automático.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="card p-6 relative bg-white border border-zinc-200">
                <div className="text-3xl font-black text-brand-200 font-mono">{s.num}</div>
                <h3 className="mt-3 text-lg font-bold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos Principais */}
      <section id="recursos" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">Recursos Poderosos</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950">
              Tudo o que você precisa para dominar conversões
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600">
              Unimos as melhores funcionalidades do ManyChat com o poder dos Agentes de IA Generativa treinados na sua empresa.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="card p-6 space-y-4 hover:shadow-lg transition-all border border-zinc-200">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600">
                    {b.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900">{b.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção Agentes de IA & Base de Conhecimento RAG */}
      <section id="ia-conhecimento" className="border-t border-zinc-200/80 bg-gradient-to-br from-brand-900 via-zinc-900 to-black py-20 text-white sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300 border border-brand-500/30">
                <Sparkles className="h-3.5 w-3.5" /> Conhecimento sob medida
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Seu Agente de IA treinado com os documentos da sua empresa
              </h2>
              <p className="mt-4 text-zinc-300 leading-relaxed text-sm sm:text-base">
                Chega de respostas genéricas ou robôs que erram preços e detalhes. No NexusReply, você faz upload de manuais em PDF, catálogos em Word, planilhas Excel ou páginas da web.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-brand-500/30 p-1.5 text-brand-300 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">Indexação Inteligente em JSON</h4>
                    <p className="text-xs text-zinc-400">O conteúdo dos seus arquivos é estruturado para busca semântica de alta velocidade e precisão.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-brand-500/30 p-1.5 text-brand-300 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">Atendimento 24/7 sem Alucinações</h4>
                    <p className="text-xs text-zinc-400">A IA responde dúvidas no Instagram e WhatsApp citando exatamente as informações da sua base.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-brand-500/30 p-1.5 text-brand-300 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">Suporte a Múltiplos Formatos</h4>
                    <p className="text-xs text-zinc-400">PDF, DOCX, XLSX, CSV, Markdown, TXT e links do Google Drive ou OneDrive.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/login?mode=signup"
                  className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400 transition-colors inline-flex items-center gap-2"
                >
                  Experimentar com IA Grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs text-zinc-400">
                <span className="font-mono">NexusReply • RAG Engine</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Pronto para Resposta
                </span>
              </div>
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="rounded-lg bg-zinc-900/90 p-3 text-zinc-300 border border-zinc-800">
                  <span className="text-brand-400">&gt; Documentos Indexados:</span>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    • Catalogo_Produtos_2026.pdf (14 seções, 42 chunks)
                    <br />• Tabela_Precos_e_Prazos.xlsx (3 abas, 18 chunks)
                    <br />• Politica_Garantia_FAQ.docx (8 seções, 16 chunks)
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/90 p-3 text-zinc-300 border border-zinc-800">
                  <span className="text-emerald-400">&gt; Pergunta do Cliente no Direct:</span>
                  <p className="mt-1 text-white">&quot;Vocês entregam em Minas Gerais e tem garantia?&quot;</p>
                </div>
                <div className="rounded-lg bg-brand-950/70 p-3 text-brand-200 border border-brand-800/60">
                  <span className="text-brand-300">&gt; Resposta Gerada pelo Agente:</span>
                  <p className="mt-1 text-xs">
                    &quot;Olá! Sim, entregamos em toda a região de Minas Gerais em até 48h úteis com frete expresso. Além disso, todos os nossos produtos contam com garantia integral de 1 ano. Gostaria que eu te envie o link com os detalhes?&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos & Teste Gratuito */}
      <section id="teste-gratis" className="py-20 sm:py-28 bg-zinc-50/50 border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">Comece sem Risco</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950">
              Cadastre-se e ganhe 20 dias de teste grátis
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">
              Explore o poder da automação para Instagram. Quando estiver pronto para escalar para WhatsApp e fluxos ilimitados, fale com nosso administrador.
            </p>
          </div>

          <div className="mt-14 mx-auto max-w-lg rounded-2xl border-2 border-brand-500 bg-white p-8 shadow-2xl relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-bold uppercase text-white tracking-wider shadow-sm">
              Plano de Teste Gratuito
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-zinc-900">Período de Experimentação</h3>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-zinc-950">20</span>
                <span className="text-lg font-bold text-zinc-600">dias grátis</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Sem renovação automática • Sem cartão de crédito</p>
            </div>

            <div className="mt-8 space-y-3 border-t border-zinc-100 pt-6 text-sm text-zinc-700">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>1 Fluxo de automação ativo</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>1 Conta do Instagram oficial conectada</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Gatilhos em Reels, Posts e Stories específicos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Agentes de IA com upload de documentos</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Agendamentos com Google Meet e Teams</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="h-4 w-4 rounded-full border border-zinc-300 flex items-center justify-center text-[10px] shrink-0">✕</span>
                <span>Conexão com WhatsApp (exclusivo para assinantes VIP)</span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/login?mode=signup"
                className="btn-primary w-full py-3.5 text-center font-bold text-base shadow-lg shadow-brand-600/30 block"
              >
                Criar Minha Conta Gratuita
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-zinc-400">
              Precisa de fluxos ilimitados ou WhatsApp? Fale com <span className="font-semibold text-zinc-700">carlos@conexaoagil.com.br</span>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800 text-sm">
              <span className="text-brand-600">Nexus</span>Reply
            </span>
            <span>• Automação Inteligente Meta</span>
          </div>

          <div>
            Desenvolvido para máxima conversão com APIs oficiais e IA.
          </div>

          <div>
            &copy; {new Date().getFullYear()} NexusReply. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
