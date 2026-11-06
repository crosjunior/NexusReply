# CLAUDE.md — ReplyFlow

Automação de DMs e comentários do Instagram (estilo ManyChat). Next.js 16 + Supabase (self-hosted) + Tailwind 4 + React Flow.
Plano de execução: **docs/PRD.md** (execute fase a fase e pare em cada CHECKPOINT).

## Comandos
- `npm run dev` · `npm test` (vitest) · `npx tsc --noEmit` · `npm run build` (Next + worker)
- Deploy: `docker compose up -d --build` · logs: `docker compose logs -f app worker`
- Saúde: `curl -s https://$APP_DOMAIN/api/health`

## Mapa do código
- `src/lib/engine/` — motor PURO (sem I/O). Toda regra de fluxo vive aqui e tem teste em `core.test.ts`. O simulador do builder roda este mesmo código no navegador.
- `src/lib/runtime/` — I/O: `process-event.ts` (webhook → gatilho/sessão), `sessions.ts`, `effects.ts` (envio Graph API, tags, rate limit), `jobs.ts`/`worker.ts` (fila Postgres).
- `src/lib/instagram/` — cliente Graph API (Instagram Login, graph.instagram.com) e normalização de webhooks.
- `src/app/api/webhooks/instagram` — valida HMAC, grava `webhook_events`, responde 200 e processa em `after()`.
- `scripts/worker.ts` — loop contínuo do worker (VPS). Compilado com esbuild para `dist/worker.mjs`.
- `supabase/migrations/` — schema, RLS e RPCs (`claim_jobs`, `consume_rate`, `acquire_lock`).

## Regras do projeto
- Mudou regra de fluxo? Altere `engine/core.ts` + teste. Nunca coloque I/O no engine.
- Escritas sensíveis (tokens, triggers, jobs) só com `admin()` (service role) no servidor; o resto via cliente com sessão + RLS.
- Toda tabela nova: `workspace_id`, RLS habilitado e policy com `public.is_member(workspace_id)`.
- Webhook precisa responder rápido: nada pesado antes do `return` — use `after()` ou `enqueue()`.
- Idempotência sempre: `dedupe_key`, `mid` único, `comment_replies`.
- Respeite regras da Meta: janela de 24h, 1 private reply por comentário, botões ≤ 3 (título ≤ 20), quick replies ≤ 13, texto ≤ 1000 (≤ 640 com botões).
- Textos de interface em português do Brasil.

## Armadilhas conhecidas
- Next 16: `middleware.ts` virou `src/proxy.ts`; `params`/`searchParams`/`cookies()` são assíncronos.
- `server-only` lança erro fora do React Server: o worker é compilado com `--conditions=react-server`.
- `@supabase/ssr` deriva o nome do cookie de auth do host da URL → o cliente de usuário usa SEMPRE `NEXT_PUBLIC_SUPABASE_URL`. `SUPABASE_INTERNAL_URL` é só para o service role.
- `NEXT_PUBLIC_*` entram no bundle em tempo de build: mudou? Rebuild da imagem.
- `useEffect(() => el.scrollIntoView())` quebra no Chrome recente (retorna Promise) — use corpo com chaves.
- lucide-react v1 não tem ícones de marca (Instagram etc.).

## Segurança
- Nunca imprima, commite ou cole no chat valores de `.env`. Gere segredos com `openssl rand`.
- Postgres (5432/6543) e gateway do Supabase (8000) não podem ficar abertos na internet; só 80/443 (e 22 restrito ao seu IP).
- Antes de qualquer ação destrutiva (DROP, reset, `docker volume rm`, mudança no Supabase) peça confirmação.
