import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function createPortalToken(params: {
  userId: string;
  orgId?: string | null;
  eventId: string;
  clientId?: string;
  clientEmail?: string;
  permissions?: Record<string, boolean>;
  expiresInDays?: number;
}): Promise<{ token: string; portalUrl: string }> {
  const supabase = await createClient();
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  
  // Calculate expiry date
  const expiresInDays = params.expiresInDays ?? 90;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  // Default permissions
  const permissions = params.permissions ?? {
    view_event: true,
    view_proposal: true,
    send_messages: true,
    update_guest_count: false,
  };
  
  const { error } = await supabase
    .from("client_portal_tokens")
    .insert({
      user_id: params.userId,
      organization_id: params.orgId || null,
      event_id: params.eventId,
      client_id: params.clientId || null,
      client_email: params.clientEmail || null,
      token,
      permissions,
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) {
    throw new Error(`Failed to create portal token: ${error.message}`);
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/portal/${token}`;
  
  return { token, portalUrl };
}

export async function validatePortalToken(token: string): Promise<{
  valid: boolean;
  data?: {
    id: string;
    userId: string;
    orgId: string | null;
    eventId: string;
    clientId: string | null;
    clientEmail: string | null;
    permissions: Record<string, boolean>;
    lastAccessedAt: string | null;
  };
  error?: string;
}> {
  // Validate token format before querying — must be a hex string from crypto.randomBytes
  if (!token || typeof token !== "string" || !/^[a-f0-9]{32,128}$/.test(token)) {
    return { valid: false, error: "Invalid or expired token" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_portal_tokens")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .single();
  
  if (error || !data) {
    return {
      valid: false,
      error: "Invalid or expired token",
    };
  }

  // Check expiration — use same generic error to prevent token enumeration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return {
      valid: false,
      error: "Invalid or expired token",
    };
  }
  
  // Update last accessed time
  await supabase
    .from("client_portal_tokens")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id);
  
  return {
    valid: true,
    data: {
      id: data.id,
      userId: data.user_id,
      orgId: data.organization_id,
      eventId: data.event_id,
      clientId: data.client_id,
      clientEmail: data.client_email,
      permissions: data.permissions,
      lastAccessedAt: data.last_accessed_at,
    },
  };
}

export async function revokePortalToken(
  tokenId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  
  // Verify ownership
  const { data: token, error: fetchError } = await supabase
    .from("client_portal_tokens")
    .select("user_id")
    .eq("id", tokenId)
    .single();
  
  if (fetchError || !token || token.user_id !== userId) {
    throw new Error("Unauthorized or token not found");
  }
  
  const { error } = await supabase
    .from("client_portal_tokens")
    .update({ is_active: false })
    .eq("id", tokenId);
  
  if (error) {
    throw new Error(`Failed to revoke token: ${error.message}`);
  }
}

export async function getPortalTokensForEvent(
  eventId: string,
  userId: string
): Promise<
  Array<{
    id: string;
    clientEmail: string | null;
    isActive: boolean;
    lastAccessedAt: string | null;
    createdAt: string;
  }>
> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("client_portal_tokens")
    .select("id, client_email, is_active, last_accessed_at, created_at")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch portal tokens: ${error.message}`);
  }
  
  return (data || []).map((token) => ({
    id: token.id,
    clientEmail: token.client_email,
    isActive: token.is_active,
    lastAccessedAt: token.last_accessed_at,
    createdAt: token.created_at,
  }));
}
