export type CalendarProvider = "google" | "outlook";

export interface CalendarConnection {
  id: string;
  workspace_id: string;
  provider: CalendarProvider;
  account_email: string;
  calendar_id: string | null;
  status: "active" | "disconnected";
  settings: {
    duration_minutes: number;
    create_meeting_link: boolean;
    business_hours: {
      start: string; // "09:00"
      end: string;   // "18:00"
    };
  };
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  workspace_id: string;
  calendar_connection_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  provider_event_id: string | null;
  status: "scheduled" | "cancelled" | "rescheduled";
  created_at: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
  label: string; // "Segunda, 10/11 às 14:00"
}

