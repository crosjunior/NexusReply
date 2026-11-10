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

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**
- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**
- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**
- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->

