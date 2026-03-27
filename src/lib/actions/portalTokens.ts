"use server";

import { createClient } from "@/lib/supabase/server";
import { createPortalToken, getPortalTokensForEvent, revokePortalToken } from "@/lib/cain/portal";

export async function generatePortalTokenAction(params: {
  eventId: string;
  clientEmail?: string;
  clientName?: string;
}): Promise<{ token: string; portalUrl: string }> {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Unauthorized");
  }
  
  // Verify user owns the event
  const { data: event } = await supabase
    .from("events")
    .select("user_id, organization_id")
    .eq("id", params.eventId)
    .single();
  
  if (!event || event.user_id !== user.id) {
    throw new Error("Unauthorized: You do not own this event");
  }
  
  return createPortalToken({
    userId: user.id,
    orgId: event.organization_id,
    eventId: params.eventId,
    clientEmail: params.clientEmail,
  });
}

export async function fetchPortalTokensAction(eventId: string): Promise<
  Array<{
    id: string;
    clientEmail: string | null;
    isActive: boolean;
    lastAccessedAt: string | null;
    createdAt: string;
  }>
> {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Unauthorized");
  }
  
  // Verify user owns the event
  const { data: event } = await supabase
    .from("events")
    .select("user_id")
    .eq("id", eventId)
    .single();
  
  if (!event || event.user_id !== user.id) {
    throw new Error("Unauthorized: You do not own this event");
  }
  
  return getPortalTokensForEvent(eventId, user.id);
}

export async function revokePortalTokenAction(tokenId: string): Promise<void> {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error("Unauthorized");
  }
  
  return revokePortalToken(tokenId, user.id);
}
