import { createClient } from "@/lib/supabase/server";
import type { OrgContext, OrgMemberRole } from "@/types";

/**
 * Get the current user's active organization context.
 * Returns null if user has no organization.
 */
export async function getCurrentOrg(): Promise<OrgContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's current org from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_organization_id) {
    // Fallback: get first org they belong to
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) return null;

    // Set it as current
    await supabase
      .from("profiles")
      .update({ current_organization_id: membership.organization_id })
      .eq("id", user.id);

    return {
      userId: user.id,
      orgId: membership.organization_id,
      role: membership.role as OrgMemberRole,
    };
  }

  // Get role for current org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profile.current_organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) return null;

  return {
    userId: user.id,
    orgId: profile.current_organization_id,
    role: membership.role as OrgMemberRole,
  };
}

/**
 * Require an authenticated user with an active organization.
 * Throws/returns error if not authenticated or no org.
 */
export async function requireOrg(): Promise<OrgContext> {
  const ctx = await getCurrentOrg();
  if (!ctx) throw new Error("No organization context");
  return ctx;
}

/**
 * Check if user has at least the required role level.
 * Role hierarchy: owner > admin > manager > staff > viewer
 */
export function hasRole(userRole: OrgMemberRole, requiredRole: OrgMemberRole): boolean {
  const hierarchy: OrgMemberRole[] = ["viewer", "staff", "manager", "admin", "owner"];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole);
}

/**
 * Get all organizations a user belongs to.
 */
export async function getUserOrganizations(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role, status, organizations(id, name, slug, organization_type, logo_url)")
    .eq("user_id", userId)
    .eq("status", "active");
  return data ?? [];
}

/**
 * Switch user's current organization.
 */
export async function switchOrganization(userId: string, orgId: string): Promise<boolean> {
  const supabase = await createClient();

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .eq("status", "active")
    .single();

  if (!membership) return false;

  await supabase
    .from("profiles")
    .update({ current_organization_id: orgId })
    .eq("id", userId);

  return true;
}
