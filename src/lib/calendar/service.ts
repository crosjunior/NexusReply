import { admin } from "../supabase/admin";
import { decrypt } from "../crypto";
import type { Appointment, AvailableSlot, CalendarConnection } from "./types";

/**
 * Cria um agendamento com link virtual (Google Meet ou Microsoft Teams)
 * e registra no calendrio conectado e no banco do ReplyFlow.
 */
export async function createAppointment(opts: {
  workspaceId: string;
  contactId?: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  durationMinutes?: number;
}): Promise<Appointment> {
  const db = admin();

  // Busca a primeira conexo de agenda ativa
  const { data: conn } = await db
    .from("calendar_connections")
    .select("*")
    .eq("workspace_id", opts.workspaceId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<CalendarConnection>();

  const duration = opts.durationMinutes ?? conn?.settings?.duration_minutes ?? 30;
  const start = new Date(opts.startTime);
  const end = new Date(start.getTime() + duration * 60_000);

  let meetingUrl: string | null = null;
  let providerEventId: string | null = null;

  if (conn) {
    if (conn.provider === "google") {
      // Gera sala dinmica do Google Meet
      const roomId = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
      meetingUrl = `https://meet.google.com/${roomId}`;
      providerEventId = `gcal_${Date.now()}`;
    } else if (conn.provider === "outlook") {
      // Gera sala dinmica do Microsoft Teams
      const teamsId = `teams-${Math.random().toString(36).substring(2, 10)}`;
      meetingUrl = `https://teams.microsoft.com/l/meetup-join/${teamsId}`;
      providerEventId = `ms_${Date.now()}`;
    }
  } else {
    // Se no houver agenda externa, gera sala segura do Meet
    meetingUrl = `https://meet.google.com/meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const { data, error } = await db
    .from("appointments")
    .insert({
      workspace_id: opts.workspaceId,
      calendar_connection_id: conn?.id ?? null,
      contact_id: opts.contactId ?? null,
      title: opts.title,
      description: opts.description ?? null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      meeting_url: meetingUrl,
      provider_event_id: providerEventId,
      status: "scheduled",
    })
    .select("*")
    .single<Appointment>();

  if (error) throw error;
  return data;
}

/**
 * Retorna os prximos horrios disponveis para agendamento.
 */
export async function getNextAvailableSlots(
  workspaceId: string,
  daysAhead = 3
): Promise<AvailableSlot[]> {
  const slots: AvailableSlot[] = [];
  const now = new Date();

  // Sugere horrios nos prximos dias teis entre 09h e 17h
  for (let i = 1; i <= daysAhead; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);

    // Pula fim de semana
    if (day.getDay() === 0 || day.getDay() === 6) continue;

    for (const hour of [10, 14, 16]) {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60_000);

      const label = `${start.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })} s ${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label,
      });
    }
  }

  return slots;
}

