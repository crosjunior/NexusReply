"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";

export async function saveCalendarConnection(formData: FormData): Promise<void> {
  const { workspaceId } = await requireSession();
  const provider = String(formData.get("provider") ?? "google").trim() as "google" | "outlook";
  const email = String(formData.get("email") ?? "").trim();
  const calendarId = String(formData.get("calendarId") ?? "primary").trim() || "primary";
  const duration = Number(formData.get("duration") ?? 30);
  const createMeetingLink = formData.get("createMeetingLink") === "on";

  if (!email) return;

  const db = admin();
  // Cria ou atualiza a conexão de agenda
  const { error } = await db
    .from("calendar_connections")
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        account_email: email,
        calendar_id: calendarId,
        access_token_enc: encrypt("calendar_dummy_or_oauth_token"),
        status: "active",
        settings: {
          duration_minutes: duration,
          create_meeting_link: createMeetingLink,
          business_hours: { start: "09:00", end: "18:00" },
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) console.error("Erro ao salvar conexão de agenda:", error.message);
  revalidatePath("/app/connections");
}

export async function disconnectCalendar(id: string) {
  const { workspaceId } = await requireSession();
  const db = admin();
  await db
    .from("calendar_connections")
    .update({ status: "disconnected" })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  revalidatePath("/app/connections");
}
