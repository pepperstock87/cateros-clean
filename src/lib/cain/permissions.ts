// CAIN Permissions Model
//
// Three execution modes that control what CAIN can do autonomously:
//
// 1. "suggest"        — CAIN proposes actions, user must manually execute
// 2. "draft-confirm"  — CAIN prepares the action, user clicks confirm
// 3. "auto-execute"   — CAIN executes immediately (e.g., lookup tools)
//
// Each tool/action has a default permission level. Users and org admins
// can override per-tool permissions via business_settings.

import { createClient } from "@/lib/supabase/server";

export type CainPermissionLevel = "suggest" | "draft-confirm" | "auto-execute";

export interface CainToolPermission {
  tool: string;
  level: CainPermissionLevel;
  description: string;
  category: "read" | "write" | "execute";
}

// Default permissions for each tool — conservative defaults
const DEFAULT_TOOL_PERMISSIONS: CainToolPermission[] = [
  // Read tools — auto-execute by default (safe, no side effects)
  { tool: "lookup_recipes", level: "auto-execute", description: "Search recipe database", category: "read" },
  { tool: "lookup_inventory", level: "auto-execute", description: "Check inventory levels", category: "read" },
  { tool: "lookup_staff", level: "auto-execute", description: "List staff members", category: "read" },
  { tool: "lookup_staff_availability", level: "auto-execute", description: "Check staff schedules", category: "read" },
  { tool: "lookup_clients", level: "auto-execute", description: "Search client database", category: "read" },
  { tool: "lookup_past_events", level: "auto-execute", description: "Find similar past events", category: "read" },
  { tool: "get_business_defaults", level: "auto-execute", description: "Get business rates", category: "read" },

  // Write tools — draft-confirm by default (creates data)
  { tool: "finalize_plan", level: "draft-confirm", description: "Finalize event plan", category: "write" },
  { tool: "propose_staff_assignment", level: "draft-confirm", description: "Propose staff assignment", category: "write" },
  { tool: "propose_event_status_change", level: "draft-confirm", description: "Propose event status change", category: "write" },
  { tool: "propose_create_client", level: "draft-confirm", description: "Propose creating a client", category: "write" },
  { tool: "propose_duplicate_event", level: "draft-confirm", description: "Propose duplicating an event", category: "write" },
  { tool: "propose_update_inventory", level: "draft-confirm", description: "Propose inventory update", category: "write" },
  { tool: "propose_purchase_order", level: "draft-confirm", description: "Propose purchase order", category: "write" },

  // Write tools — suggest by default (external side effects like sending)
  { tool: "propose_send_proposal", level: "suggest", description: "Propose sending proposal to client", category: "execute" },
  { tool: "propose_send_invoice", level: "suggest", description: "Propose sending invoice to client", category: "execute" },
  { tool: "propose_send_payment_reminder", level: "suggest", description: "Propose sending payment reminder", category: "execute" },
  { tool: "propose_send_message", level: "suggest", description: "Propose sending email message", category: "execute" },

  // Legacy write tools — draft-confirm by default
  { tool: "create_event", level: "draft-confirm", description: "Create a new event", category: "write" },
  { tool: "update_pricing", level: "draft-confirm", description: "Modify event pricing", category: "write" },
  { tool: "assign_staff", level: "draft-confirm", description: "Assign staff to event", category: "write" },
  { tool: "send_proposal", level: "suggest", description: "Send proposal to client", category: "execute" },
  { tool: "create_invoice", level: "suggest", description: "Generate an invoice", category: "execute" },
  { tool: "send_message", level: "suggest", description: "Send message to client", category: "execute" },

  // Integration tools — suggest by default (external side effects)
  { tool: "sync_quickbooks", level: "suggest", description: "Sync to QuickBooks", category: "execute" },
  { tool: "export_payroll", level: "suggest", description: "Export to payroll", category: "execute" },
];

export interface CainPermissionConfig {
  /** User-level overrides */
  overrides: Record<string, CainPermissionLevel>;
  /** Global mode — if set, overrides all individual permissions */
  globalMode?: CainPermissionLevel;
}

/**
 * Get the effective permission level for a tool.
 * Priority: global mode > user override > default
 */
export function getToolPermission(
  tool: string,
  config?: CainPermissionConfig | null
): CainPermissionLevel {
  // Global mode overrides everything
  if (config?.globalMode) return config.globalMode;

  // User-specific override
  if (config?.overrides?.[tool]) return config.overrides[tool];

  // Default permission
  const defaultPerm = DEFAULT_TOOL_PERMISSIONS.find((p) => p.tool === tool);
  return defaultPerm?.level ?? "suggest"; // Unknown tools default to suggest (safest)
}

/**
 * Check if a tool can be auto-executed given the current permission config.
 */
export function canAutoExecute(
  tool: string,
  config?: CainPermissionConfig | null
): boolean {
  return getToolPermission(tool, config) === "auto-execute";
}

/**
 * Check if a tool needs user confirmation before executing.
 */
export function needsConfirmation(
  tool: string,
  config?: CainPermissionConfig | null
): boolean {
  const level = getToolPermission(tool, config);
  return level === "draft-confirm" || level === "suggest";
}

/**
 * Get all tool permissions with effective levels for display in settings UI.
 */
export function getAllToolPermissions(
  config?: CainPermissionConfig | null
): Array<CainToolPermission & { effectiveLevel: CainPermissionLevel }> {
  return DEFAULT_TOOL_PERMISSIONS.map((perm) => ({
    ...perm,
    effectiveLevel: getToolPermission(perm.tool, config),
  }));
}

/**
 * Load the user's CAIN permission config from business_settings.
 */
export async function loadCainPermissions(
  userId: string,
  orgId: string | null
): Promise<CainPermissionConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("cain_permissions")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.cain_permissions) return null;
  return data.cain_permissions as CainPermissionConfig;
}

/**
 * Save the user's CAIN permission config to business_settings.
 */
export async function saveCainPermissions(
  userId: string,
  config: CainPermissionConfig
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("business_settings")
    .upsert(
      { user_id: userId, cain_permissions: config },
      { onConflict: "user_id" }
    );
}
