import { requireSession } from "@/lib/supabase/server";
import { Inbox } from "@/components/inbox/Inbox";

export default async function InboxPage() {
  const { workspaceId } = await requireSession();
  return <Inbox workspaceId={workspaceId} />;
}
