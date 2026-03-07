"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/organizations";
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createEventInviteAction(data: {
  eventId: string;
  relationshipType: string;
  roleLabel?: string;
  invitedEmail?: string;
  invitedName?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  const inviteToken = generateToken();

  // Verify user owns the event
  let eventQuery = supabase
    .from("events")
    .select("id")
    .eq("id", data.eventId)
    .eq("user_id", user.id);
  if (org?.orgId) eventQuery = eventQuery.eq("organization_id", org.orgId);
  const { data: event } = await eventQuery.single();

  if (!event) return { error: "Event not found or unauthorized" };

  const { data: invite, error } = await supabase
    .from("event_invites")
    .insert({
      event_id: data.eventId,
      organization_id: org?.orgId || null,
      created_by: user.id,
      invite_token: inviteToken,
      relationship_type: data.relationshipType,
      role_label: data.roleLabel || null,
      invited_email: data.invitedEmail || null,
      invited_name: data.invitedName || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/event/invite/${inviteToken}`;

  revalidatePath(`/events/${data.eventId}`);

  return {
    success: true,
    invite_token: inviteToken,
    invite_url: inviteUrl,
    invite,
  };
}

export async function getEventInvitesAction(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invites, error } = await supabase
    .from("event_invites")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, invites: [] };

  return { invites: invites ?? [] };
}

export async function revokeEventInviteAction(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The RLS policy ensures only event owners can update
  const { data: invite, error: fetchError } = await supabase
    .from("event_invites")
    .select("event_id")
    .eq("id", inviteId)
    .single();

  if (fetchError || !invite) return { error: "Invite not found" };

  const { error } = await supabase
    .from("event_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) return { error: error.message };

  revalidatePath(`/events/${invite.event_id}`);
  return { success: true };
}

export async function acceptEventInviteAction(inviteToken: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to accept an invite" };

  // Use service role to read/update invite (since the accepting user won't own the event)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite, error: fetchError } = await serviceClient
    .from("event_invites")
    .select("*")
    .eq("invite_token", inviteToken)
    .single();

  if (fetchError || !invite) return { error: "Invite not found" };

  if (invite.status === "accepted") return { error: "This invite has already been accepted" };
  if (invite.status === "revoked") return { error: "This invite has been revoked" };
  if (invite.status === "expired") return { error: "This invite has expired" };
  if (invite.status === "declined") return { error: "This invite was declined" };

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await serviceClient
      .from("event_invites")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", invite.id);
    return { error: "This invite has expired" };
  }

  // Check if user already has an org; if so, use it. Otherwise create one.
  let orgId = invite.organization_id;

  // Look for user's current organization membership
  const { data: membership } = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership) {
    orgId = membership.organization_id;
  }

  // Create event_organization record to link this vendor to the event
  if (orgId) {
    // Check if already linked
    const { data: existing } = await serviceClient
      .from("event_organizations")
      .select("id")
      .eq("event_id", invite.event_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!existing) {
      await serviceClient.from("event_organizations").insert({
        event_id: invite.event_id,
        organization_id: orgId,
        relationship_type: invite.relationship_type,
        role_label: invite.role_label || null,
        contact_name: invite.invited_name || null,
        contact_email: invite.invited_email || user.email || null,
        is_primary: false,
        status: "active",
        notes: invite.notes || null,
      });
    }
  }

  // Update invite status
  const { error: updateError } = await serviceClient
    .from("event_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (updateError) return { error: updateError.message };

  return { success: true, eventId: invite.event_id };
}

export async function declineEventInviteAction(inviteToken: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to decline an invite" };

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite, error: fetchError } = await serviceClient
    .from("event_invites")
    .select("*")
    .eq("invite_token", inviteToken)
    .single();

  if (fetchError || !invite) return { error: "Invite not found" };
  if (invite.status !== "pending") return { error: "This invite is no longer pending" };

  const { error: updateError } = await serviceClient
    .from("event_invites")
    .update({
      status: "declined",
      accepted_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  if (updateError) return { error: updateError.message };

  return { success: true };
}
