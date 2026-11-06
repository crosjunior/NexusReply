/**
 * Worker contínuo para VPS: processa jobs (delays, retries, rate limit),
 * reprocessa webhooks presos e renova tokens. Pode rodar N réplicas em paralelo
 * (claim_jobs usa FOR UPDATE SKIP LOCKED).
 *
 * Build: npm run build:worker  →  node dist/worker.mjs
 */
import { tick } from "../src/lib/runtime/worker";

const IDLE_MS = Number(process.env.WORKER_IDLE_MS ?? 3000);
let stopping = false;

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} recebido, finalizando após o ciclo atual…`);
    stopping = true;
  });
}

async function main() {
  console.log(`[worker] iniciado (idle ${IDLE_MS}ms)`);
  while (!stopping) {
    try {
      const r = await tick(20_000);
      if (r.processed) console.log(`[worker] processados=${r.processed} em ${r.ms}ms`);
      else await new Promise((res) => setTimeout(res, IDLE_MS));
    } catch (err) {
      console.error("[worker] erro no ciclo", err);
      await new Promise((res) => setTimeout(res, IDLE_MS * 2));
    }
  }
  process.exit(0);
}

main();
