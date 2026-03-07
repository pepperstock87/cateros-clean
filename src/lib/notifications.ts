// Email notification helper
// Uses a simple fetch-based approach that can be connected to any email provider
// For now, stores notifications in the database for the dashboard to pick up

import { createClient } from "@supabase/supabase-js";

type NotificationType =
  | "proposal_accepted"
  | "proposal_declined"
  | "proposal_viewed"
  | "proposal_approved"
  | "proposal_signed"
  | "proposal_booked"
  | "revision_requested"
  | "payment_received";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link_url: params.linkUrl,
    read: false,
  });
}
