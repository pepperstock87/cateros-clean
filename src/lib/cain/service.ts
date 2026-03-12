// CAIN Service Layer
//
// Central orchestration layer between the UI and CAIN's capabilities.
// Responsibilities:
//   - Context assembly (company, client, event)
//   - Permission enforcement before tool execution
//   - Domain event emission after actions
//   - Session/conversation management
//   - Routing to the appropriate engine (event builder, chat, etc.)
//
// This is the single entry point for all CAIN interactions.
// UI components call CainService methods, never the engine directly.

import { domainEvents } from "@/lib/events";
import { loadCainPermissions, getToolPermission, type CainPermissionConfig } from "./permissions";
import { buildCompanyContext, buildFullContext, type CompanyContext } from "./memory";
import { runCainEventBuilder } from "./engine";
import { commitCainPlan } from "./commit";
import type { CainEventPlan } from "./types";

// ─── Session Types ───

export interface CainSession {
  userId: string;
  orgId: string | null;
  permissions: CainPermissionConfig | null;
  companyContext: CompanyContext;
}

export interface CainEventBuilderRequest {
  brief: string;
  constraints?: {
    maxBudget?: number;
    dietaryRestrictions?: string;
  };
  clientId?: string;
  eventId?: string; // If re-planning an existing event
}

export interface CainCommitResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// ─── Service Layer ───

/**
 * Initialize a CAIN session with user context and permissions.
 * Call this once per request/interaction.
 */
export async function createCainSession(
  userId: string,
  orgId: string | null
): Promise<CainSession> {
  const [permissions, companyContext] = await Promise.all([
    loadCainPermissions(userId, orgId),
    buildCompanyContext(userId, orgId),
  ]);

  return { userId, orgId, permissions, companyContext };
}

/**
 * Run the CAIN event builder with full context, permissions, and event emission.
 * Returns a readable SSE stream.
 */
export async function runEventBuilder(
  session: CainSession,
  request: CainEventBuilderRequest
): Promise<ReadableStream<Uint8Array>> {
  // Check if the user can auto-execute the event builder flow
  // All read tools are auto-execute by default, finalize_plan is draft-confirm
  // The engine handles the tool loop internally — permission checks for
  // individual tools will be enforced within the engine in a future iteration.

  // Build additional context if we have a client or event reference
  let contextString: string | undefined;
  if (request.clientId || request.eventId) {
    contextString = await buildFullContext({
      userId: session.userId,
      orgId: session.orgId,
      eventId: request.eventId,
      clientId: request.clientId,
    });
  }

  const stream = await runCainEventBuilder({
    userId: session.userId,
    orgId: session.orgId,
    brief: request.brief,
    companyName: session.companyContext.businessName ?? undefined,
    constraints: request.constraints,
    contextString,
  });

  return stream;
}

/**
 * Commit a finalized CAIN plan to create an event.
 * Enforces permissions and emits domain events.
 */
export async function commitPlan(
  session: CainSession,
  plan: CainEventPlan
): Promise<CainCommitResult> {
  // Check permission for the commit action
  const commitPermission = getToolPermission("create_event", session.permissions);
  if (commitPermission === "suggest") {
    // In suggest mode, we just return the plan without committing
    // The UI should show the plan and let the user manually create the event
    return {
      success: false,
      error: "CAIN is in suggest-only mode. Please create the event manually from the plan.",
    };
  }

  const result = await commitCainPlan({
    plan,
    userId: session.userId,
    orgId: session.orgId,
  });

  if ("error" in result) {
    return { success: false, error: result.error };
  }

  // Emit domain events
  await domainEvents.emit(
    "cain.plan.committed",
    {
      eventId: result.eventId,
      userId: session.userId,
      orgId: session.orgId,
      planId: plan.id,
      eventName: plan.event.name,
      suggestedPrice: plan.pricing.suggestedPrice,
    },
    "cain/service"
  );

  await domainEvents.emit(
    "event.created",
    {
      eventId: result.eventId,
      userId: session.userId,
      orgId: session.orgId,
      eventName: plan.event.name,
      clientName: plan.event.client_name,
      clientId: plan.event.client_id ?? null,
      eventDate: plan.event.event_date,
      guestCount: plan.event.guest_count,
      source: "cain",
    },
    "cain/service"
  );

  return { success: true, eventId: result.eventId };
}

/**
 * Get permission info for a specific tool.
 * Used by the UI to show/hide confirmation dialogs.
 */
export function getPermissionForTool(
  session: CainSession,
  tool: string
): { level: string; needsConfirmation: boolean } {
  const level = getToolPermission(tool, session.permissions);
  return {
    level,
    needsConfirmation: level === "draft-confirm" || level === "suggest",
  };
}
