# ReplyFlow — automação de Instagram estilo ManyChat

MVP funcional para responder **DMs** e **comentários** do Instagram com **fluxos visuais**.
Stack: **Next.js 16 (App Router) + Supabase (Postgres, Auth, Realtime) + Tailwind 4 + React Flow**.
Integração 100% oficial: **Instagram API with Instagram Login** (Meta), sem senha nem automação de navegador.

## O que já funciona

| Área | Recursos |
|---|---|
| Conexão | OAuth oficial do Instagram, token longo (60 dias) criptografado com AES-256-GCM, renovação automática, inscrição automática nos webhooks |
| Gatilhos | Comentário com palavra-chave (com resposta pública sorteada e filtro por post), DM com palavra-chave, resposta a story, menção em story, resposta padrão (com cooldown) |
| Blocos do fluxo | Mensagem (texto, imagem, até 3 botões, até 13 respostas rápidas, variáveis `{{first_name}}`), Pergunta com validação (e-mail, telefone, número), Condição (tag/campo), Ação (tag, campo, transferir para humano, webhook para n8n/Make/CRM), Espera, IA (OpenAI ou compatível) |
| Builder | Canvas arrastável, saídas por botão, validação ao vivo com as regras da Meta, autosave, publicar/pausar, **simulador** que roda o mesmo motor da produção |
| Inbox | Tempo real, filtros, assumir/devolver ao bot, resposta da equipe (tag HUMAN_AGENT fora das 24h), echo de mensagens enviadas pelo app do Instagram |
| Contatos | Busca, filtro por tag, edição de tags, campos capturados |
| Regras da Meta | Janela de 24h, 1 private reply por comentário (só depois do usuário interagir vêm as próximas), limite por conta/hora com fila, idempotência de webhooks |

## Arquitetura

```
Instagram ──webhook──▶ /api/webhooks/instagram ──(valida HMAC, grava webhook_events, 200 OK)
                                  │ after()
                                  ▼
                        runtime/process-event  ──lock por contato──▶ motor (engine/core, puro)
                                  │                                      │ efeitos
                                  ▼                                      ▼
                     contatos / conversas / sessões          runtime/effects ──▶ Graph API (envio)
                                                                     │  rate limit / delays
                                                                     ▼
                                       jobs (Postgres SKIP LOCKED) ◀── /api/cron/tick (pg_cron 1/min)
```

- **Motor puro** (`src/lib/engine/core.ts`): recebe grafo + estado + evento e devolve novo estado + efeitos. Zero I/O → testável e reaproveitado no simulador do builder.
- **Webhook rápido**: grava e responde 200; o processamento roda em `after()`. Se a função cair, o `tick` reprocessa (`webhook_events` com status).
- **Idempotência**: `dedupe_key` única por evento, `mid` único por mensagem, `comment_replies` garante 1 private reply por comentário.
- **Concorrência**: lock com lease por contato (`acquire_lock`) evita duas execuções simultâneas; se ocupado, reenfileira em 3s.
- **Fila**: tabela `jobs` + `claim_jobs()` com `FOR UPDATE SKIP LOCKED` (vários workers em paralelo sem conflito). Usada para delays, retries com backoff e envios adiados por rate limit.
- **Multi-tenant**: `workspaces` + RLS em todas as tabelas; token do Instagram nunca é exposto ao navegador (grant por coluna).

## Como rodar

### 1. Supabase
1. Crie um projeto em supabase.com.
2. No SQL Editor, rode `supabase/migrations/0001_init.sql`.
3. Auth → URL Configuration: Site URL = sua URL; adicione `https://SEU-DOMINIO/auth/callback` aos Redirect URLs.
4. (Recomendado) Rode `supabase/migrations/0002_cron.sql` trocando `SEU-DOMINIO` e `SEU_CRON_SECRET`. Isso dispara o worker a cada minuto (delays, retries, renovação de tokens) e funciona no plano Free.

### 2. App na Meta
1. developers.facebook.com → Criar app → tipo **Business** → adicionar produto **Instagram** → **API setup with Instagram login**.
2. Copie **Instagram App ID** e **Instagram App Secret** (são diferentes dos IDs do app Facebook).
3. Em *Business login settings*, adicione o redirect: `https://SEU-DOMINIO/api/instagram/callback`.
4. Em *Webhooks*: Callback URL `https://SEU-DOMINIO/api/webhooks/instagram`, Verify token = `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`. Assine: `comments`, `messages`, `messaging_postbacks`, `messaging_seen`, `messaging_referral`.
5. Em modo **Development** funciona com contas que tenham papel no app (adicione sua conta como *Instagram Tester*). Para clientes externos: **App Review** de `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments` (+ *Human Agent* se usar o inbox fora das 24h) e **Business Verification**.
6. Na conta do Instagram: Configurações → Mensagens → **Permitir acesso às mensagens** (ferramentas conectadas).

### 3. Variáveis e execução
```bash
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
npm test                     # testes do motor e do webhook
```
Para testar webhooks localmente, exponha a porta com um túnel HTTPS (ngrok, Cloudflare Tunnel) e use essa URL na Meta e em `NEXT_PUBLIC_APP_URL`.

### 4a. Deploy na VPS (Docker + Supabase self-hosted)
Siga **docs/PRD.md** (feito para ser executado pelo Claude Code, fase a fase). Resumo: `.env` → `docker compose up -d --build` (app + worker contínuo + Caddy com HTTPS) → `/api/health`.

### 4b. Deploy (Vercel)
Importe o repositório, configure as mesmas variáveis e faça o deploy. O `vercel.json` tem um cron diário de segurança (compatível com o plano Hobby); o cron por minuto vem do `pg_cron` do Supabase.

## Estrutura

```
src/
  lib/engine/      motor puro, matching de palavras-chave, validação (com testes)
  lib/instagram/   cliente da Graph API e normalização de webhooks
  lib/runtime/     processamento de eventos, sessões, efeitos, fila, worker, IA
  app/api/         webhook, OAuth do Instagram, cron
  app/app/         dashboard, fluxos, builder, inbox, contatos, conta
  components/      builder (React Flow), inbox, navegação
supabase/migrations/  schema, RLS, RPCs (fila, rate limit, lock) e cron
```

## Próximos passos para escalar
- **Worker dedicado**: quando o volume crescer, rode `tick()` num processo contínuo (Railway/Fly/ECS) em vez de cron + serverless — o código já é idempotente e paralelo.
- **Cobrança**: Stripe com planos por nº de contatos (`workspaces.plan`).
- **Equipe**: convites para `workspace_members` (papéis já existem: owner/admin/agent).
- **Métricas por bloco**: contar envios/cliques por `nodeId` (o payload dos botões já carrega `flowId|nodeId|handleId`).
- **Canais**: WhatsApp Cloud API e Messenger reaproveitam motor, fluxos e inbox; só muda o adaptador de envio/webhook.
- **Growth tools**: links `ig.me/m/CONTA?ref=...` (`messaging_referral`) e QR codes como novos gatilhos.
