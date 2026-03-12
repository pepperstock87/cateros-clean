"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OrgMemberRole } from "@/types";

// ---------------------------------------------------------------------------
// Helper: get current user + org context + verify admin
// ---------------------------------------------------------------------------

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization" } as const;
  const orgId = profile.current_organization_id;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Insufficient permissions" } as const;
  }

  return { supabase, user, orgId, role: membership.role as OrgMemberRole };
}

// ---------------------------------------------------------------------------
// inviteTeamMember
// ---------------------------------------------------------------------------

export async function inviteTeamMember(email: string, role: OrgMemberRole) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, user, orgId } = ctx;

  // Validate email
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "Invalid email address" };
  }

  // Can't invite as owner
  if (role === "owner") {
    return { error: "Cannot invite someone as owner" };
  }

  // Check if already a member
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      return { error: "This user is already a member of the organization" };
    }
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from("organization_invites")
    .select("id")
    .eq("organization_id", orgId)
    .eq("invited_email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { error: "An invite has already been sent to this email" };
  }

  // Create the invite
  const { data: invite, error: insertErr } = await supabase
    .from("organization_invites")
    .insert({
      organization_id: orgId,
      invited_by: user.id,
      invited_email: normalizedEmail,
      role,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, invite_token")
    .single();

  if (insertErr || !invite) {
    return { error: "Failed to create invite" };
  }

  // If user already exists on the platform, we could add them directly
  // For now, we create the invite and they can accept via the invite page
  // In a production app, you'd also send an email notification here

  revalidatePath("/team");
  return { success: "Invite sent successfully", inviteId: invite.id, inviteToken: invite.invite_token };
}

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Fetch the invite
  const { data: invite } = await supabase
    .from("organization_invites")
    .select("id, organization_id, invited_email, role, status, expires_at")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "pending") return { error: "This invite is no longer valid" };

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("organization_invites")
      .update({ status: "expired" })
      .eq("id", inviteId);
    return { error: "This invite has expired" };
  }

  // Verify the logged-in user's email matches the invite
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (profile?.email?.toLowerCase() !== invite.invited_email.toLowerCase()) {
    return { error: "This invite was sent to a different email address" };
  }

  // Check not already a member
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    // Mark invite as accepted anyway
    await supabase
      .from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", inviteId);
    return { error: "You are already a member of this organization" };
  }

  // Add to organization_members
  const { error: memberErr } = await supabase
    .from("organization_members")
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      status: "active",
    });

  if (memberErr) return { error: "Failed to join organization" };

  // Update the invite
  await supabase
    .from("organization_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", inviteId);

  // Set as current org if user doesn't have one
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.current_organization_id) {
    await supabase
      .from("profiles")
      .update({ current_organization_id: invite.organization_id })
      .eq("id", user.id);
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { success: "You have joined the organization", orgId: invite.organization_id };
}

// ---------------------------------------------------------------------------
// declineInvite
// ---------------------------------------------------------------------------

export async function declineInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: invite } = await supabase
    .from("organization_invites")
    .select("id, invited_email, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "pending") return { error: "This invite is no longer valid" };

  await supabase
    .from("organization_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);

  revalidatePath("/team");
  return { success: "Invite declined" };
}

// ---------------------------------------------------------------------------
// cancelInvite (admin only)
// ---------------------------------------------------------------------------

export async function cancelInvite(inviteId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, orgId } = ctx;

  const { data: invite } = await supabase
    .from("organization_invites")
    .select("id, organization_id, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Invite not found" };
  if (invite.organization_id !== orgId) return { error: "Invite not in your organization" };
  if (invite.status !== "pending") return { error: "Can only cancel pending invites" };

  await supabase
    .from("organization_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  revalidatePath("/team");
  return { success: "Invite cancelled" };
}

// ---------------------------------------------------------------------------
// removeTeamMember
// ---------------------------------------------------------------------------

export async function removeTeamMember(memberId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, user, orgId } = ctx;

  // Get the target member
  const { data: target } = await supabase
    .from("organization_members")
    .select("role, user_id, organization_id")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "Member not found" };
  if (target.organization_id !== orgId) return { error: "Member not in your organization" };
  if (target.role === "owner") return { error: "Cannot remove the organization owner" };
  if (target.user_id === user.id) return { error: "Cannot remove yourself" };

  await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  revalidatePath("/team");
  return { success: "Member removed" };
}

// ---------------------------------------------------------------------------
// updateMemberRole
// ---------------------------------------------------------------------------

export async function updateMemberRole(memberId: string, newRole: OrgMemberRole) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, orgId, role: callerRole } = ctx;

  if (newRole === "owner") {
    return { error: "Cannot assign owner role" };
  }

  const { data: target } = await supabase
    .from("organization_members")
    .select("role, organization_id")
    .eq("id", memberId)
    .single();

  if (!target) return { error: "Member not found" };
  if (target.organization_id !== orgId) return { error: "Member not in your organization" };
  if (target.role === "owner") return { error: "Cannot change the owner's role" };

  // Only owners can promote to admin
  if (newRole === "admin" && callerRole !== "owner") {
    return { error: "Only the owner can promote members to admin" };
  }

  await supabase
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  revalidatePath("/team");
  return { success: "Role updated" };
}

// ---------------------------------------------------------------------------
// updateOrganization
// ---------------------------------------------------------------------------

export async function updateOrganization(orgId: string, data: { name?: string; logo_url?: string }) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, orgId: currentOrgId } = ctx;

  if (orgId !== currentOrgId) return { error: "Can only update your current organization" };

  const updateData: Record<string, string> = {};
  if (data.name?.trim()) updateData.name = data.name.trim();
  if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;

  if (Object.keys(updateData).length === 0) {
    return { error: "No changes provided" };
  }

  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", orgId);

  if (error) return { error: "Failed to update organization" };

  revalidatePath("/team");
  revalidatePath("/settings");
  return { success: "Organization updated" };
}

// ---------------------------------------------------------------------------
// getPendingInvites (for the team page)
// ---------------------------------------------------------------------------

export async function getPendingInvites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", invites: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization", invites: [] };

  const { data: invites } = await supabase
    .from("organization_invites")
    .select("id, invited_email, role, status, created_at, expires_at, invited_by, invite_token, inviter:profiles!organization_invites_invited_by_fkey(full_name, email)")
    .eq("organization_id", profile.current_organization_id)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });

  return { invites: invites ?? [] };
}

// ---------------------------------------------------------------------------
// getMyPendingInvites (for the invites page - invites sent to current user)
// ---------------------------------------------------------------------------

export async function getMyPendingInvites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", invites: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!profile?.email) return { error: "No profile", invites: [] };

  const { data: invites } = await supabase
    .from("organization_invites")
    .select("id, organization_id, invited_email, role, status, created_at, expires_at, invite_token, invited_by, organization:organizations(id, name, organization_type, logo_url), inviter:profiles!organization_invites_invited_by_fkey(full_name, email)")
    .eq("invited_email", profile.email.toLowerCase())
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return { invites: invites ?? [] };
}
