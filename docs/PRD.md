# PRD de execução — ReplyFlow na VPS AWS + Supabase self-hosted

> **Para o Claude Code:** este documento é o seu plano de trabalho. Leia também `CLAUDE.md`.
> Execute **uma fase por vez**. Ao fim de cada fase, mostre o resultado dos critérios de aceite e **pare no CHECKPOINT** aguardando "ok" do Carlos.
> Não invente valores de ambiente: descubra na máquina ou pergunte. Nunca exiba segredos no terminal/chat (mascare: `abcd…wxyz`).

---

## 1. Contexto

**Produto:** plataforma SaaS multi-tenant para automação de Instagram (DMs e comentários) com builder visual de fluxos, no modelo ManyChat.
**Estado atual:** o MVP está implementado neste repositório (motor de fluxos, webhooks, OAuth, inbox, contatos, builder, simulador; 14 testes passando). Ele **ainda não foi executado contra a Meta real nem contra o Supabase do Carlos**.
**Objetivo deste PRD:** colocar o MVP em produção na VPS AWS (EC2) do Carlos, usando o Supabase self-hosted que ele já tem, e validá-lo ponta a ponta com uma conta real do Instagram.

### Infra-alvo
```
Internet ──443──▶ Caddy (TLS automático) ──▶ app (Next.js standalone :3000)
                                               │  service role (rede interna)
                    worker (node dist/worker.mjs) ┤
                                               ▼
                         Supabase self-hosted (gateway :8000 → Postgres, Auth, Realtime)
Navegador ──443──▶ URL pública do Supabase (Auth + Realtime + REST com RLS)
Meta ──443──▶ https://APP_DOMAIN/api/webhooks/instagram
```
- App e worker usam a **mesma imagem** Docker. O worker roda em loop (sem cron serverless).
- Se o Supabase estiver na mesma EC2, app/worker entram na rede Docker dele (`SUPABASE_DOCKER_NETWORK`). Se estiver em outra máquina, usar a URL pública/privada da VPC e remover a rede externa do compose.

### Fora de escopo nesta entrega
Cobrança (Stripe), convite de equipe, WhatsApp/Messenger, métricas por bloco — ficam no backlog (seção 10).

---

## 2. Requisitos funcionais que devem funcionar em produção

| # | Requisito | Como verificar |
|---|---|---|
| RF1 | Cadastro/login por e-mail e senha; workspace criado automaticamente | Criar conta, ver dashboard |
| RF2 | Conectar conta profissional do Instagram via OAuth oficial; token criptografado; webhooks inscritos | Tela Conta mostra "Ativa · webhooks inscritos" |
| RF3 | Gatilho **comentário com palavra-chave** → resposta pública + private reply com botão | Comentar "EU QUERO" num post |
| RF4 | Clique no botão continua o fluxo (link, tag) | Tocar no botão no direct |
| RF5 | Gatilho **DM com palavra-chave** e **resposta padrão** (com cooldown) | Mandar DM |
| RF6 | Bloco **Pergunta** valida e salva campo (e-mail) | Responder e-mail inválido e válido |
| RF7 | **Condição**, **Ação** (tag, campo, handoff, webhook) e **Espera** | Fluxo de teste dedicado |
| RF8 | **IA** responde se `OPENAI_API_KEY` existir; sem chave, usa fallback | Fluxo "Atendente com IA" |
| RF9 | **Inbox em tempo real**; assumir conversa pausa o bot; resposta da equipe chega no Instagram | Responder pelo inbox |
| RF10 | Regras da Meta: janela 24h, 1 private reply por comentário, limite/hora com fila | Testes da Fase 6 |
| RF11 | Simulador do builder reproduz o fluxo sem enviar nada | Botão "Testar" |

## 3. Requisitos não funcionais

- **Disponibilidade:** containers com `restart: unless-stopped`; `/api/health` retorna 200 com `jobs_due` e `webhook_failed`.
- **Latência:** webhook responde 200 em < 1 s (processamento assíncrono). Resposta ao usuário em < 5 s em operação normal.
- **Idempotência:** eventos repetidos da Meta não geram mensagens duplicadas.
- **Escala horizontal:** é possível subir `docker compose up -d --scale worker=3` sem efeitos colaterais (fila com `SKIP LOCKED`, lock por contato).
- **Segurança:** HTTPS válido; só 80/443 públicos (22 restrito ao IP do Carlos); Postgres e gateway do Supabase fechados para a internet; Studio do Supabase protegido por senha forte; RLS em todas as tabelas; token do Instagram inacessível pelo navegador; segredos apenas em `.env` com `chmod 600`.
- **Hardware:** o Supabase self-hosted pede no mínimo 4 GB de RAM e 2 vCPUs (8 GB+ e 4+ vCPUs recomendados). Com o app na mesma EC2, considerar 8 GB.

---

## 4. Fase 1 — Diagnóstico (somente leitura)

**Tarefas**
1. Sistema: `uname -a`, `lsb_release -a` (ou `/etc/os-release`), `nproc`, `free -h`, `df -h`.
2. Docker: `docker --version`, `docker compose version`, `docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'`, `docker network ls`.
3. Supabase self-hosted: localizar a pasta do compose (ex.: `~/supabase/docker`). Identificar **sem imprimir valores**:
   - gateway (Kong ou Envoy) e porta interna (padrão 8000) e o nome do serviço/container na rede Docker;
   - nomes das chaves no `.env` do Supabase — instalação antiga usa `ANON_KEY`/`SERVICE_ROLE_KEY`; nova usa `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`;
   - `SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL` (pode mostrar, não são segredos);
   - se o SMTP está configurado (`SMTP_HOST` preenchido) — senão, cadastro precisa de autoconfirmação de e-mail.
4. Postgres: via `docker exec` no container do banco, rodar `select version();`, `select name from pg_available_extensions where name in ('pgcrypto','pg_cron','pg_net');`, `select pubname from pg_publication;`.
5. Rede: a URL pública do Supabase responde com HTTPS válido? (`curl -sI https://SUPABASE_PUBLIC_URL/auth/v1/health`). Quais portas estão abertas no Security Group (pedir ao Carlos se não houver AWS CLI)?
6. DNS: o domínio do app (ex.: `app.seudominio.com.br`) já aponta para o IP da EC2? (`dig +short`).

**Entregável:** relatório curto com: o que existe, o que falta, riscos (RAM, portas abertas, ausência de SMTP/HTTPS) e o plano das próximas fases ajustado.

**🛑 CHECKPOINT 1** — aguardar aprovação.

---

## 5. Fase 2 — Banco no Supabase self-hosted

**Tarefas**
1. Backup antes de tudo: `pg_dump` do banco para `~/backups/pre-replyflow-<data>.sql.gz`.
2. Verificar conflito de nomes: se já existirem tabelas `public.flows`, `public.contacts`, `public.jobs` etc., **parar e propor** um schema dedicado ou prefixo.
3. Aplicar `supabase/migrations/0001_init.sql` como superusuário (`postgres`) dentro de transação (`psql -v ON_ERROR_STOP=1 --single-transaction`).
4. **Não** aplicar `0002_cron.sql` (o worker contínuo substitui o cron). Opcional: aplicar só a parte de limpeza diária se `pg_cron` existir.
5. Auth do Supabase (no `.env` do Supabase + restart só dos serviços de auth, **com confirmação**):
   - `SITE_URL=https://APP_DOMAIN`
   - redirect adicional: `https://APP_DOMAIN/auth/callback` (variável `ADDITIONAL_REDIRECT_URLS` ou equivalente da versão instalada)
   - sem SMTP: habilitar autoconfirmação de e-mail temporariamente e registrar isso como pendência.

**Critérios de aceite** (rodar e mostrar):
```sql
select count(*) from information_schema.tables where table_schema='public'
  and table_name in ('workspaces','workspace_members','ig_accounts','contacts','flows','triggers',
                     'conversations','messages','flow_sessions','webhook_events','comment_replies','jobs','rate_buckets','locks'); -- = 14
select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'; -- todas true
select proname from pg_proc where proname in ('claim_jobs','consume_rate','acquire_lock','release_lock','is_member','handle_new_user'); -- 6
select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename in ('messages','conversations'); -- 2
select has_column_privilege('authenticated','public.ig_accounts','access_token_enc','select'); -- false
```

**🛑 CHECKPOINT 2**

---

## 6. Fase 3 — Configuração do app

**Tarefas**
1. Colocar o repositório na VPS (git clone do repositório privado do Carlos ou upload do zip) em `/opt/replyflow`.
2. Criar `.env` a partir de `.env.example` (`chmod 600 .env`):
   - `NEXT_PUBLIC_APP_URL=https://APP_DOMAIN`, `APP_DOMAIN=...`
   - `NEXT_PUBLIC_SUPABASE_URL` = URL **pública** HTTPS do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/publishable key; `SUPABASE_SERVICE_ROLE_KEY` = service role/secret key (copiar do `.env` do Supabase **sem exibir**)
   - `SUPABASE_DOCKER_NETWORK` = rede descoberta na Fase 1; `SUPABASE_INTERNAL_URL` = `http://<serviço-gateway>:8000`
   - gerar: `TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)`, `CRON_SECRET=$(openssl rand -hex 24)`, `INSTAGRAM_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)`
   - `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`: **pedir ao Carlos que cole direto no arquivo** (ele obtém na Fase 5; pode deixar vazio por enquanto)
   - `OPENAI_API_KEY`: opcional
3. Se o Supabase estiver em outra máquina: remover a rede `supabase` do `docker-compose.yml` e deixar `SUPABASE_INTERNAL_URL` vazio (ou IP privado da VPC).
4. Security Group: liberar 80 e 443 para 0.0.0.0/0; garantir 5432, 6543, 8000 e a porta do Studio **fechadas** externamente (o acesso público ao Supabase deve passar pelo proxy HTTPS dele).

**Critérios de aceite:** `.env` sem campos obrigatórios vazios (exceto Instagram), permissões 600, DNS do `APP_DOMAIN` resolvendo para a EC2.

**🛑 CHECKPOINT 3**

---

## 7. Fase 4 — Build e deploy

**Tarefas**
1. `npm ci && npm test && npx tsc --noEmit` (pode ser dentro de um container `node:22` se a VPS não tiver Node).
2. `docker compose build` e `docker compose up -d`.
3. Se a porta 80/443 já estiver ocupada por outro proxy (ex.: Nginx do Supabase), **não** subir o Caddy: adicionar um server block/route para `APP_DOMAIN → app:3000` no proxy existente e remover o serviço `caddy` do compose. Confirmar a abordagem antes.
4. Aguardar o certificado e testar.

**Critérios de aceite**
- `curl -s https://APP_DOMAIN/api/health` → `{"ok":true,...}`
- `curl -s "https://APP_DOMAIN/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=$TOKEN&hub.challenge=123"` → `123`
- `POST` sem assinatura no webhook → 401
- `docker compose logs worker` mostra `[worker] iniciado`
- Cadastro de usuário funciona e o dashboard abre (RF1)

**🛑 CHECKPOINT 4**

---

## 8. Fase 5 — App na Meta (passos manuais do Carlos, guiados pelo Claude)

O Claude deve apresentar este checklist e esperar o Carlos concluir cada item:
1. developers.facebook.com → Criar app (tipo **Business**) → produto **Instagram** → **API setup with Instagram login**.
2. Copiar **Instagram App ID** e **Instagram App Secret** para o `.env` (o Carlos cola; o Claude só confirma que existem) e reiniciar: `docker compose up -d`.
3. Business login settings → redirect: `https://APP_DOMAIN/api/instagram/callback`.
4. Webhooks → Callback `https://APP_DOMAIN/api/webhooks/instagram`, Verify token = `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`; assinar `comments`, `messages`, `messaging_postbacks`, `messaging_seen`, `messaging_referral`.
5. App Roles → adicionar a conta do Instagram do Carlos como **Instagram Tester** e aceitar o convite no Instagram.
6. No app do Instagram: Configurações → Mensagens → permitir acesso às mensagens por ferramentas conectadas.
7. No ReplyFlow: Conta → **Conectar Instagram**.

**Critério de aceite:** tela Conta mostra a conta "Ativa · webhooks inscritos" (RF2).

**🛑 CHECKPOINT 5**

---

## 9. Fase 6 — Testes ponta a ponta (conta tester)

Usar uma **segunda conta** do Instagram como "cliente". Para cada cenário: executar, conferir no Instagram, no Inbox e nas tabelas (`webhook_events`, `flow_sessions`, `messages`), e registrar ✅/❌ com evidência (log ou query).

| Cenário | Esperado |
|---|---|
| T1 Template "Comentário → DM", comentar `eu quero` | resposta pública + private reply com botão (RF3) |
| T2 Tocar no botão | link enviado, tag `lead-comentario` no contato (RF4) |
| T3 Comentar sem a palavra-chave | nada é enviado; comentário aparece no Inbox |
| T4 DM `LINK` | fluxo inicia por DM (RF5) |
| T5 Template "Captura de e-mail": responder `abc` e depois um e-mail válido | mensagem de erro e depois campo `email` salvo (RF6) |
| T6 Fluxo com Espera de 1 min | segunda mensagem chega ~1 min depois (worker) (RF7) |
| T7 Ação "Transferir para humano" | conversa vai para filtro Humano; bot para de responder (RF9) |
| T8 Resposta pelo Inbox | chega no Instagram; aparece como "equipe" (RF9) |
| T9 Responder pelo app do Instagram | aparece no Inbox como "equipe" (echo) |
| T10 Reenviar o mesmo webhook (replay manual com assinatura válida) | ignorado, sem duplicar (RNF idempotência) |
| T11 `MAX_SENDS_PER_HOUR=2` temporário, disparar 3 envios | 3º vira job para a próxima hora (RF10) |
| T12 Simulador do builder | mesmo comportamento sem envio real (RF11) |

Corrigir bugs encontrados **com teste** quando a regra estiver no engine. Ao final, restaurar `MAX_SENDS_PER_HOUR`.

**🛑 CHECKPOINT 6** — relatório de testes.

---

## 10. Fase 7 — Operação

1. **Backup diário** do Postgres (crontab do host): `pg_dump | gzip` para `~/backups` + envio para S3 (`aws s3 cp`, bucket informado pelo Carlos), retenção de 14 dias.
2. **Logs:** limitar logs do Docker (`logging: max-size: 10m, max-file: 3`) no compose.
3. **Monitoramento:** documentar URL do `/api/health` para um monitor externo (UptimeRobot/BetterStack) e alertar se `webhook_failed` > 0 por mais de 15 min.
4. **Atualização:** script `deploy/update.sh` (`git pull && docker compose build && docker compose up -d && curl health`).
5. **Rollback:** manter a imagem anterior com tag (`replyflow:prev`) e documentar o comando.
6. **Runbook** em `docs/RUNBOOK.md`: reiniciar, ver logs, reprocessar `webhook_events` com falha, reconectar token expirado, restaurar backup.

**🛑 CHECKPOINT 7**

---

## 11. Backlog após go-live (priorizar com o Carlos)
1. App Review da Meta + Business Verification (necessário para clientes externos) — preparar vídeo-roteiro e textos de uso das permissões.
2. SMTP transacional (Resend/SES) e desligar autoconfirmação.
3. Stripe com planos por nº de contatos (`workspaces.plan`).
4. Convites de equipe e papéis (owner/admin/agent já modelados).
5. Métricas por bloco (envios/cliques por `nodeId`).
6. Growth tools: links `ig.me/m/<conta>?ref=` (`messaging_referral`) e QR code.
7. Canais WhatsApp Cloud API e Messenger reaproveitando engine e inbox.

## 12. Definition of Done
- Fases 1–7 concluídas com checkpoints aprovados.
- T1–T12 ✅ com evidências.
- `/api/health` ok, worker ativo, backup testado (restore em banco temporário).
- Nenhum segredo em git, logs ou chat; portas do banco fechadas.
