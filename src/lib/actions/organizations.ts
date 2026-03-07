"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OrgMemberRole } from "@/types";

export async function createOrganizationAction(data: {
  name: string;
  organization_type?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      slug,
      organization_type: data.organization_type || "caterer",
      primary_contact_email: user.email,
    })
    .select("id")
    .single();

  if (orgError || !org) return { error: "Failed to create organization" };

  // Add creator as owner
  await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  // Set as current org
  await supabase
    .from("profiles")
    .update({ current_organization_id: org.id })
    .eq("id", user.id);

  revalidatePath("/settings");
  return { success: true, organizationId: org.id };
}

export async function inviteMemberAction(data: {
  email: string;
  role: OrgMemberRole;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get current org
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization" };
  const orgId = profile.current_organization_id;

  // Check caller is admin/owner
  const { data: callerMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
    return { error: "Insufficient permissions" };
  }

  // Find invited user by email
  const { data: invitedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", data.email)
    .single();

  if (!invitedProfile) {
    return { error: "User not found. They must create an account first." };
  }

  // Check not already a member
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", invitedProfile.id)
    .maybeSingle();

  if (existing) return { error: "User is already a member" };

  // Add member
  const { error } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: invitedProfile.id,
    role: data.role,
    status: "active",
  });

  if (error) return { error: "Failed to add member" };

  revalidatePath("/team");
  return { success: true };
}

export async function updateMemberRoleAction(memberId: string, newRole: OrgMemberRole) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization" };

  // Check caller is owner/admin
  const { data: callerMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profile.current_organization_id)
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
    return { error: "Insufficient permissions" };
  }

  // Can't change owner role
  const { data: target } = await supabase
    .from("organization_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (target?.role === "owner") return { error: "Cannot change owner role" };

  await supabase
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  revalidatePath("/team");
  return { success: true };
}

export async function removeMemberAction(memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization" };

  // Check caller is owner/admin
  const { data: callerMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profile.current_organization_id)
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
    return { error: "Insufficient permissions" };
  }

  // Can't remove owner
  const { data: target } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .single();

  if (target?.role === "owner") return { error: "Cannot remove organization owner" };
  if (target?.user_id === user.id) return { error: "Cannot remove yourself" };

  await supabase.from("organization_members").delete().eq("id", memberId);

  revalidatePath("/team");
  return { success: true };
}

export async function updateOrganizationAction(data: {
  name?: string;
  organization_type?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) return { error: "No organization" };

  const { error } = await supabase
    .from("organizations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", profile.current_organization_id);

  if (error) return { error: "Failed to update organization" };

  revalidatePath("/settings");
  revalidatePath("/team");
  return { success: true };
}

export async function switchOrganizationAction(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .eq("status", "active")
    .single();

  if (!membership) return { error: "Not a member of this organization" };

  await supabase
    .from("profiles")
    .update({ current_organization_id: orgId })
    .eq("id", user.id);

  revalidatePath("/");
  return { success: true };
}
