import "server-only";
import { admin } from "../supabase/admin";

export type JobType = "process_event" | "resume_session" | "send_effects" | "refresh_tokens";

export async function enqueue(type: JobType, payload: Record<string, unknown>, runAt = new Date()) {
  const { error } = await admin().from("jobs").insert({ type, payload, run_at: runAt.toISOString() });
  if (error) throw error;
}

export interface JobRow {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

export async function claimJobs(batch = 25): Promise<JobRow[]> {
  const { data, error } = await admin().rpc("claim_jobs", { batch });
  if (error) throw error;
  return (data ?? []) as JobRow[];
}

export async function completeJob(id: string) {
  await admin().from("jobs").update({ status: "done", locked_at: null }).eq("id", id);
}

/** Backoff exponencial: 30s, 2min, 8min, 32min... */
export async function failJob(job: JobRow, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const final = job.attempts >= job.max_attempts;
  await admin()
    .from("jobs")
    .update({
      status: final ? "failed" : "queued",
      locked_at: null,
      last_error: msg.slice(0, 1000),
      run_at: new Date(Date.now() + 30_000 * 4 ** (job.attempts - 1)).toISOString(),
    })
    .eq("id", job.id);
}
