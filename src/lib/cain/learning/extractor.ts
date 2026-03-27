/**
 * CAIN Memory Extractor
 *
 * After each CAIN session, analyzes the conversation and plan
 * to extract learnings. Uses heuristic rules (no AI calls) to identify
 * preferences, patterns, corrections, and insights.
 */

import type { CainEventPlan } from "../types";
import type { MemoryType, MemoryCategory } from "./memory-store";

export interface ExtractedMemory {
  memoryType: MemoryType;
  category: MemoryCategory;
  subject?: string;
  content: string;
  confidence: number;
}

export interface ExtractMemoriesParams {
  userId: string;
  orgId?: string | null;
  sessionMessages: Array<{
    role: string;
    content: string;
  }>;
  plan?: CainEventPlan | null;
  rejectedActions?: Array<{
    action_type: string;
    reason?: string;
  }>;
}

/**
 * Extract memories from a completed CAIN session.
 * Analyzes conversation, plan, and rejections to identify learnings.
 *
 * Current rules implemented:
 * 1. Rejected actions → correction memories
 * 2. Staff member assigned to 3+ events → preference memories
 * 3. Pricing manually adjusted upward → preference memories
 *
 * TODO: Additional rules
 * 4. Specific menu items in 3+ plans → pattern memories
 * 5. Client-specific preferences from menu choices → insight memories
 * 6. Recurring bartender for bar events → preference memories
 */
export function extractMemories(params: ExtractMemoriesParams): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];

  // Rule 1: Extract corrections from rejected actions
  memories.push(...extractRejectionMemories(params.rejectedActions ?? []));

  // Rules 2-3: Extract from event plan
  if (params.plan) {
    memories.push(...extractPlanMemories(params.plan));
  }

  // TODO: Rules 4-6 would analyze sessionMessages for:
  // - Menu item frequency across sessions
  // - Client preferences based on selections
  // - Staff role patterns

  return memories.filter((m) => m.content.length <= 200); // Keep memories concise
}

/**
 * Rule 1: Extract correction memories from rejected actions.
 *
 * When a user rejects a proposed action, it signals a correction
 * to CAIN's understanding of preferences or workflows.
 */
function extractRejectionMemories(rejectedActions: Array<{ action_type: string; reason?: string }>): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];

  for (const rejection of rejectedActions) {
    const actionLabel = formatActionType(rejection.action_type);
    const reasonText = rejection.reason ? `. Reason: ${rejection.reason}` : "";

    memories.push({
      memoryType: "correction",
      category: "operations",
      content: `User declined ${actionLabel}${reasonText}`,
      confidence: 0.85,
    });
  }

  return memories;
}

/**
 * Rules 2-3: Extract learnings from the event plan.
 *
 * Rule 2: If staff members are frequently assigned, record preference.
 * Rule 3: If pricing is manually adjusted upward, record pricing preference.
 */
function extractPlanMemories(plan: CainEventPlan): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];

  // Rule 2: Staff member preferences
  // Count unique staff assignments in the pricing/staffing sections
  const staffCounts = new Map<string, number>();

  for (const staffLine of plan.pricing.staffing) {
    const staffName = extractStaffName(staffLine.role);
    if (staffName) {
      staffCounts.set(staffName, (staffCounts.get(staffName) ?? 0) + 1);
    }
  }

  // If a staff member appears multiple times in one plan (suggesting frequency),
  // note it as a preference (though single plan won't trigger this alone,
  // this sets foundation for reinforcement across multiple plans)
  for (const [staffName, count] of staffCounts.entries()) {
    if (count >= 2) {
      memories.push({
        memoryType: "preference",
        category: "staffing",
        subject: staffName,
        content: `${staffName} is frequently assigned to ${plan.event.event_type || "events"}`,
        confidence: 0.75,
      });
    }
  }

  // Rule 3: Pricing adjustment preferences
  // If final price differs significantly from suggested price, record preference
  if (plan.pricing.suggestedPrice && plan.pricing.totalCost) {
    const pricingMargin = calculateMarginPercentage(
      plan.pricing.suggestedPrice,
      plan.pricing.totalCost
    );

    if (pricingMargin > (plan.pricing.targetMarginPercent + 5)) {
      memories.push({
        memoryType: "preference",
        category: "pricing",
        content: `User prefers higher pricing margins (${pricingMargin.toFixed(1)}%) than CAIN suggests (${plan.pricing.targetMarginPercent}%)`,
        confidence: 0.8,
      });
    }
  }

  // Placeholder comments for future rules:
  // TODO: Rule 4 - Menu item pattern detection
  // Scan menu items across session history (would need session context)
  // to identify popular items that appear in 3+ plans
  //
  // TODO: Rule 5 - Client-specific insights
  // Analyze which menu items selected for known clients
  // to infer dietary preferences or event type associations
  //
  // TODO: Rule 6 - Vendor/staff role patterns
  // Track which staff members/vendors appear for specific event types
  // (e.g., bartender Maria always handles bar events)

  return memories;
}

/**
 * Helper: Extract staff name from role string.
 * Handles formats like "Lead Server - Maria Rodriguez" or "Maria Rodriguez (Lead Server)"
 */
function extractStaffName(role: string): string | null {
  // Pattern: "Name — Role" or "Role — Name"
  const dashSplit = role.split(" — ").map((s) => s.trim());
  if (dashSplit.length === 2) {
    const part = dashSplit[1];
    // If second part looks like a name (not all caps, has space or capital letters)
    if (part.includes(" ") || /[A-Z][a-z]/.test(part)) {
      return part;
    }
    return dashSplit[0];
  }

  // Pattern: "Name (Role)" or "Role (Name)"
  const parenMatch = role.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    // If part1 looks like a name
    if (part1.includes(" ") || /[A-Z][a-z]/.test(part1)) {
      return part1;
    }
    return part2;
  }

  // If no separator, assume entire string is the reference (could be just name)
  if (role.includes(" ") || /[A-Z][a-z]/.test(role)) {
    return role;
  }

  return null;
}

/**
 * Helper: Format action type for readability.
 */
function formatActionType(actionType: string): string {
  return actionType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Helper: Calculate margin percentage from price and cost.
 */
function calculateMarginPercentage(price: number, cost: number): number {
  if (cost === 0) return 0;
  return ((price - cost) / price) * 100;
}
