import {
  Bot,
  Clock,
  GitBranch,
  MessageSquare,
  PlayCircle,
  TextCursorInput,
  Zap,
} from "lucide-react";
import type { NodeType } from "@/lib/engine/types";

export interface ComponentDetails {
  type: NodeType;
  label: string;
  badge: string;
  icon: typeof Bot;
  color: string;
  bgColor: string;
  borderLight: string;
  objective: string;
  whatItDoes: string;
  contextExample: string;
  suggestedNext: NodeType[];
}

export const COMPONENT_DETAILS: Record<NodeType, ComponentDetails> = {
  start: {
    type: "start",
    label: "Início (Gatilho)",
    badge: "Disparo",
    icon: PlayCircle,
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    borderLight: "border-emerald-200",
    objective: "Detectar a interação do usuário no Instagram (comentário em post/reels, story ou direct) para dar início automático ao fluxo.",
    whatItDoes: "Monitora palavras-chave específicas (ex: 'QUERO', 'PREÇO') ou qualquer comentário/mensagem em publicações da sua conta. Quando um lead comenta ou manda DM, ativa a automação instantaneamente.",
    contextExample: "O usuário comenta 'QUERO' no Reels sobre seu novo curso. O gatilho captura o comentário e avança para o envio de uma mensagem no Direct.",
    suggestedNext: ["message", "ai", "input", "condition", "action"],
  },
  message: {
    type: "message",
    label: "Mensagem",
    badge: "Comunicação",
    icon: MessageSquare,
    color: "bg-brand-600",
    bgColor: "bg-brand-50",
    borderLight: "border-brand-200",
    objective: "Enviar uma resposta direta, personalizada e acolhedora no Direct do Instagram ou WhatsApp com botões interativos.",
    whatItDoes: "Entrega textos dinâmicos (com variáveis como {{first_name}}), imagens e até 3 botões clicáveis (com link para páginas externas ou botões que avançam para outros passos do fluxo) e respostas rápidas.",
    contextExample: "Envia no Direct: 'Oi {{first_name}}! Vi seu comentário no post. Toque no botão abaixo que eu te envio o link de acesso agora mesmo.' com o botão 'Quero o link'.",
    suggestedNext: ["input", "condition", "action", "delay", "ai"],
  },
  input: {
    type: "input",
    label: "Pergunta (Captura de Lead)",
    badge: "Qualificação",
    icon: TextCursorInput,
    color: "bg-sky-500",
    bgColor: "bg-sky-50",
    borderLight: "border-sky-200",
    objective: "Coletar e validar informações de contato do cliente (como WhatsApp, e-mail ou nome) para salvar no seu CRM.",
    whatItDoes: "Envia uma pergunta na conversa, aguarda a resposta do usuário e valida se o formato está correto (ex: e-mail válido ou telefone com DDD). Salva o valor automaticamente no cadastro do contato.",
    contextExample: "Pergunta: 'Qual o seu melhor e-mail para receber a planilha gratuita?'. Salva no campo 'email'. Se responder com formato válido, avança pelo ponto 'Respondeu'.",
    suggestedNext: ["action", "condition", "message", "ai"],
  },
  condition: {
    type: "condition",
    label: "Condição (Ramificação)",
    badge: "Lógica",
    icon: GitBranch,
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    borderLight: "border-amber-200",
    objective: "Filtrar e segmentar contatos criando caminhos diferentes no fluxo com base em dados ou histórico.",
    whatItDoes: "Avalia se o contato já possui uma tag (ex: 'cliente-vip') ou se um campo está preenchido. Oferece duas saídas de conexão: 'Sim' (se a condição for atendida) e 'Não' (se não for).",
    contextExample: "Verifica se o contato tem a tag 'comprador'. Se 'Sim', envia mensagem VIP com cupom de desconto. Se 'Não', envia mensagem de apresentação da mentoria.",
    suggestedNext: ["message", "action", "ai", "delay"],
  },
  action: {
    type: "action",
    label: "Ação (CRM & Tags)",
    badge: "Automação",
    icon: Zap,
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    borderLight: "border-pink-200",
    objective: "Executar ações automáticas nos bastidores para organizar contatos ou integrar com outros sistemas sem enviar texto visível.",
    whatItDoes: "Aplica ou remove tags (ex: 'lead-qualificado'), preenche campos cadastrais, transfere a conversa para um atendente humano (handoff) ou dispara um webhook para seu sistema externo.",
    contextExample: "Aplica a tag 'interessado-mentoria' e define o campo 'status = qualificado' assim que o cliente clica no botão ou responde a pergunta.",
    suggestedNext: ["message", "delay", "ai"],
  },
  delay: {
    type: "delay",
    label: "Espera (Pausa Estratégica)",
    badge: "Tempo",
    icon: Clock,
    color: "bg-zinc-500",
    bgColor: "bg-zinc-50",
    borderLight: "border-zinc-200",
    objective: "Aguardar um intervalo de tempo para humanizar a conversa ou fazer follow-up inteligente sem parecer um robô invasivo.",
    whatItDoes: "Pausa a execução do fluxo pelo número de minutos configurado (ex: 15 minutos ou 2 horas), retomando o fluxo automaticamente se a janela de 24h da Meta estiver aberta.",
    contextExample: "Após enviar o link do material, espera 15 minutos e envia: 'Conseguiu acessar o link? Se tiver qualquer dúvida sobre a mentoria, é só me chamar aqui!'.",
    suggestedNext: ["message", "condition", "ai"],
  },
  ai: {
    type: "ai",
    label: "Agente de IA (Atendimento Autônomo)",
    badge: "Inteligência Artificial",
    icon: Bot,
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50",
    borderLight: "border-indigo-200",
    objective: "Responder dúvidas dos clientes em tempo real com base no conteúdo da sua Base de Conhecimento e agendar reuniões.",
    whatItDoes: "Mantém uma conversa de até N turnos com o lead no Direct ou WhatsApp. Consulta as informações da empresa cadastradas em PDFs, DOCs ou links para tirar dúvidas com precisão e transborda para humano se solicitado.",
    contextExample: "O cliente pergunta no Direct: 'Quais os valores e horários disponíveis?'. A IA consulta a Base de Conhecimento e responde com clareza, oferecendo um link do Google Meet para agendamento.",
    suggestedNext: ["action", "message", "input"],
  },
};

