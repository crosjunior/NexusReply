"use client";

import { useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  HelpCircle as QuestionIcon,
  GitFork,
  Zap,
  Clock,
  Bot,
  Lightbulb,
  ChevronRight,
  X,
  BookOpen,
} from "lucide-react";
interface Props {
  nodes?: { type?: string }[];
}

export function ComponentGuide({ nodes = [] }: Props) {
  const [open, setOpen] = useState(false);

  // Calcula sugestões contextuais com base nos nós atuais no canvas
  const getSuggestions = () => {
    const suggestions: { title: string; desc: string; icon: typeof Lightbulb }[] = [];
    const types = new Set(nodes.map((n) => n.type));

    if (nodes.length <= 1) {
      suggestions.push({
        title: "Comece com uma Mensagem de Boas-Vindas",
        desc: "Arraste um bloco de Mensagem e conecte ao Início para enviar uma saudação no Direct quando o lead comentar.",
        icon: Lightbulb,
      });
    }

    if (types.has("message") && !types.has("input") && !types.has("ai")) {
      suggestions.push({
        title: "Qualifique o Lead com Perguntas ou IA",
        desc: "Após a mensagem inicial, adicione um nó de Pergunta (para pedir WhatsApp/E-mail) ou um nó de IA para tirar dúvidas no Direct.",
        icon: Lightbulb,
      });
    }

    if (types.has("input") && !types.has("action")) {
      suggestions.push({
        title: "Segmente com uma Ação de Tag",
        desc: "Adicione o bloco Ação 'Adicionar tag' (ex: lead-qualificado) para organizar seus contatos e disparar automações.",
        icon: Lightbulb,
      });
    }

    if (types.has("input") && types.has("ai")) {
      suggestions.push({
        title: "Entenda a ordem: Pergunta ➔ IA",
        desc: "O robô envia a pergunta no Direct e aguarda a resposta do usuário. A IA conectada na saída só responderá depois que o usuário digitar a resposta no chat.",
        icon: Lightbulb,
      });
    }

    if (types.has("ai")) {
      suggestions.push({
        title: "Turbine a IA com sua Base de Conhecimento",
        desc: "Certifique-se de cadastrar documentos e links no menu 'Base de Conhecimento' para que a IA responda com precisão aos clientes.",
        icon: BookOpen,
      });
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <>
      {/* Botão flutuante para abrir o Guia de Componentes */}
      <div className="absolute bottom-5 left-5 z-20 flex flex-col gap-2">
        {/* Banner de Sugestão Ativa (se houver) */}
        {suggestions.length > 0 && (
          <div className="hidden sm:flex max-w-sm items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/95 p-3 text-xs text-amber-900 shadow-md backdrop-blur-sm animate-in fade-in-50">
            <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-amber-950">{suggestions[0].title}</span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">{suggestions[0].desc}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(true)}
          className="btn-secondary flex items-center gap-2 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm hover:bg-zinc-50 border-zinc-200"
        >
          <HelpCircle className="h-4 w-4 text-brand-600" />
          <span className="font-semibold text-zinc-800">Guia dos Componentes & Dicas</span>
        </button>
      </div>

      {/* Modal / Painel Lateral com a Explicação dos Componentes */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 p-4 sm:px-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-600" />
                  Como Usar os Componentes do Fluxo
                </h3>
                <p className="text-xs text-zinc-500">
                  Entenda a finalidade de cada bloco visual e como combiná-los para automações de alto resultado.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1.5 text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Dica Essencial sobre Comentários e Directs */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  Como o Instagram entrega as respostas automáticas:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-amber-900/90 leading-relaxed">
                  <li>
                    <strong>Onde a resposta chega:</strong> O Instagram entrega a resposta de automação no <strong>Direct (DM)</strong> do usuário que comentou no post (além de publicar um comentário público de aviso como <em>&quot;Te mandei no direct! 📩&quot;</em>).
                  </li>
                  <li>
                    <strong>Aba de Solicitações:</strong> Se a conta de teste nunca conversou com seu perfil antes, a mensagem pode aparecer na aba de <strong>Solicitações de Mensagem (Direct)</strong> do Instagram.
                  </li>
                  <li>
                    <strong>Comportamento do bloco Pergunta:</strong> Quando o primeiro passo é uma <em>Pergunta</em> (ex: <em>&quot;Qual seu nome?&quot;</em>), o bot envia essa pergunta no Direct e <strong>pausa aguardando a resposta</strong>. Se a IA estiver conectada depois, ela só responderá quando o usuário digitar o nome no Direct.
                  </li>
                  <li>
                    <strong>Melhor Prática recomendada:</strong> Para comentários em posts/reels, inicie sempre com uma <strong>Mensagem com Botão</strong> (ex: <em>&quot;Oi! Toque no botão para receber o link&quot;</em>) ou conecte a <strong>IA</strong> logo após o Início para que ela já comece atendendo!
                  </li>
                </ul>
              </div>

              {/* Componente Mensagem */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3.5 bg-zinc-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Mensagem (Direct Instagram / WhatsApp)</h4>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Envia texto, fotos e até <strong>3 botões clicáveis</strong> ou respostas rápidas. Use para entregar links de materiais, saudar quem comentou no seu post ou apresentar opções com botões.
                  </p>
                </div>
              </div>

              {/* Componente Pergunta */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3.5 bg-zinc-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
                  <QuestionIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Pergunta (Captura de Leads)</h4>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Faz uma pergunta no chat e <strong>valida a resposta</strong> (e-mail, número de telefone ou texto). Salva a resposta automaticamente no cadastro do contato para você usar depois.
                  </p>
                </div>
              </div>

              {/* Componente Condição */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3.5 bg-zinc-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
                  <GitFork className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Condição (Ramificação Inteligente)</h4>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Verifica se o lead tem uma determinada tag (ex: <code>cliente-vip</code>) ou se preencheu algum campo. Cria saídas separadas: <strong>Sim</strong> (se a condição for atendida) e <strong>Não</strong>.
                  </p>
                </div>
              </div>

              {/* Componente Ação */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3.5 bg-zinc-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white font-bold">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Ação (Tags & Transbordo)</h4>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Executa operações de bastidor: adiciona ou remove tags do contato, atualiza dados do CRM, aciona webhooks externos ou transfere a conversa para um atendente humano.
                  </p>
                </div>
              </div>

              {/* Componente Espera */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3.5 bg-zinc-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white font-bold">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Espera (Atraso Humanizado)</h4>
                  <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                    Pausa o fluxo por alguns minutos ou horas antes do próximo passo. Útil para dar tempo ao usuário ler um link antes de enviar uma mensagem de follow-up (respeitando o limite de 24h da Meta).
                  </p>
                </div>
              </div>

              {/* Componente IA */}
              <div className="flex items-start gap-3 rounded-xl border-2 border-purple-200 p-4 bg-purple-50/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white font-bold shadow-sm">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-purple-950">Inteligência Artificial (IA Autônoma no DM)</h4>
                    <span className="rounded bg-purple-200 px-1.5 py-0.5 text-[9px] font-bold text-purple-900">
                      RAG + KNOWLEDGE
                    </span>
                  </div>
                  <p className="text-xs text-purple-900/90 mt-1 leading-relaxed">
                    Atende os clientes no Direct tirando dúvidas sobre produtos, valores, formas de pagamento, políticas e agendamentos. A IA consulta automaticamente as <strong>Bases de Conhecimento</strong> cadastradas no menu lateral e responde com a sua persona!
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 p-4 px-6 flex justify-end bg-zinc-50/50">
              <button onClick={() => setOpen(false)} className="btn-primary text-xs">
                Entendi, voltar ao fluxo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

