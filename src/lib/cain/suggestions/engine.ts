/**
 * CAIN Smart Suggestions Engine
 *
 * Proactively generates actionable recommendations based on business data.
 * NO AI calls — pure data analysis from Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import { proposeAction } from "@/lib/cain/actions/queue";
import type { CainActionPayload } from "@/lib/cain/actions/types";

export interface CainSuggestion {
  id: string;
  type: "action" | "insight" | "warning" | "opportunity";
  category: "staffing" | "pricing" | "client" | "operations" | "procurement" | "scheduling";
  title: string;
  description: string;
  urgency: "low" | "medium" | "high" | "critical";
  actionable: boolean;
  suggestedAction?: {
    toolName: string;
    params: Record<string, unknown>;
    label: string;
  };
  relatedEntityId?: string;
  relatedEntityType?: string;
  expiresAt?: string;
}

/**
 * Generate suggestions for a user based on their business state
 */
export async function generateSuggestions(
  userId: string,
  orgId: string | null,
  limit: number = 20
): Promise<CainSuggestion[]> {
  const supabase = await createClient();
  const suggestions: CainSuggestion[] = [];

  try {
    // Get all data in parallel
    const [events, staffMembers, inventory, payments, proposals, clients] = await Promise.all([
      supabase
        .from("events")
        .select(
          `
          id,
          name,
          event_date,
          guest_count,
          status,
          pricing_data,
          client_id,
          client_name,
          created_at,
          updated_at
        `
        )
        .eq("user_id", userId)
        .order("event_date", { ascending: true }),

      supabase
        .from("staff_members")
        .select("id, name, role, hourly_rate")
        .eq("user_id", userId),

      supabase
        .from("inventory")
        .select("id, ingredient_name, quantity_on_hand, par_level, unit, cost_per_unit")
        .eq("user_id", userId),

      supabase
        .from("payments")
        .select("id, event_id, amount, status, due_date")
        .eq("user_id", userId),

      supabase
        .from("proposals")
        .select("id, event_id, status, created_at")
        .eq("user_id", userId),

      supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("user_id", userId),
    ]);

    const eventsData = events.data || [];
    const staffData = staffMembers.data || [];
    const inventoryData = inventory.data || [];
    const paymentsData = payments.data || [];
    const proposalsData = proposals.data || [];
    const clientsData = clients.data || [];

    // ─── STAFFING SUGGESTIONS ───

    // 1. Events in next 14 days with 0 staff assigned
    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    for (const event of eventsData) {
      const eventDate = new Date(event.event_date);
      if (eventDate >= today && eventDate <= in14Days && event.status !== "canceled") {
        // Check staff assignments for this event
        const { data: staffAssignments, error } = await supabase
          .from("event_staff_assignments")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id);

        const staffCount = staffAssignments?.length ?? 0;

        if (staffCount === 0) {
          suggestions.push({
            id: `staffing-zero-${event.id}`,
            type: "warning",
            category: "staffing",
            title: `No staff assigned: ${event.name}`,
            description: `${event.name} on ${new Date(event.event_date).toLocaleDateString()} has 0 staff assigned for ${event.guest_count} guests.`,
            urgency: "critical",
            actionable: true,
            relatedEntityId: event.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "view_event",
              params: { eventId: event.id },
              label: "Open event to assign staff",
            },
          });
        }
        // 2. Understaffed events (fewer staff than needed)
        else {
          const requiredStaff = Math.ceil(event.guest_count / 25); // Rule: 1 staff per 25 guests
          if (staffCount < requiredStaff && staffCount > 0) {
            suggestions.push({
              id: `staffing-understaffed-${event.id}`,
              type: "warning",
              category: "staffing",
              title: `Understaffed: ${event.name}`,
              description: `${event.name} has ${staffCount} staff assigned but needs approximately ${requiredStaff} for ${event.guest_count} guests.`,
              urgency: "high",
              actionable: true,
              relatedEntityId: event.id,
              relatedEntityType: "event",
              suggestedAction: {
                toolName: "view_event",
                params: { eventId: event.id },
                label: "Add more staff to this event",
              },
            });
          }
        }
      }
    }

    // 3. Staff members assigned to multiple events on same date
    if (staffData.length > 0) {
      const staffAssignmentsMap = new Map<string, string[]>(); // staffId -> eventIds

      for (const event of eventsData) {
        const { data: assignments } = await supabase
          .from("event_staff_assignments")
          .select("staff_member_id, event_id")
          .eq("event_id", event.id);

        for (const assignment of assignments || []) {
          const key = assignment.staff_member_id;
          if (!staffAssignmentsMap.has(key)) {
            staffAssignmentsMap.set(key, []);
          }
          staffAssignmentsMap.get(key)!.push(assignment.event_id);
        }
      }

      // Check for conflicts on same date
      for (const [staffId, assignedEventIds] of staffAssignmentsMap.entries()) {
        if (assignedEventIds.length > 1) {
          const conflictingEvents = eventsData.filter((e) => assignedEventIds.includes(e.id));
          const groupedByDate = new Map<string, typeof conflictingEvents>();

          for (const evt of conflictingEvents) {
            const dateKey = new Date(evt.event_date).toLocaleDateString();
            if (!groupedByDate.has(dateKey)) {
              groupedByDate.set(dateKey, []);
            }
            groupedByDate.get(dateKey)!.push(evt);
          }

          // If any date has 2+ events, it's a conflict
          for (const [dateStr, dateEvents] of groupedByDate.entries()) {
            if (dateEvents.length > 1) {
              const staffMember = staffData.find((s) => s.id === staffId);
              suggestions.push({
                id: `staffing-conflict-${staffId}-${dateStr}`,
                type: "warning",
                category: "staffing",
                title: `Scheduling conflict: ${staffMember?.name || "Staff member"}`,
                description: `${staffMember?.name} is assigned to ${dateEvents.length} events on ${dateStr}: ${dateEvents.map((e) => e.name).join(", ")}.`,
                urgency: "high",
                actionable: true,
                relatedEntityId: staffId,
                relatedEntityType: "staff",
                suggestedAction: {
                  toolName: "view_staff",
                  params: { staffId },
                  label: "Resolve scheduling conflict",
                },
              });
            }
          }
        }
      }
    }

    // ─── PRICING SUGGESTIONS ───

    // 4. Draft events with no pricing
    for (const event of eventsData) {
      if (event.status === "draft" && !event.pricing_data) {
        suggestions.push({
          id: `pricing-missing-${event.id}`,
          type: "insight",
          category: "pricing",
          title: `Pricing not set: ${event.name}`,
          description: `${event.name} is still in draft status without pricing information.`,
          urgency: "medium",
          actionable: true,
          relatedEntityId: event.id,
          relatedEntityType: "event",
          suggestedAction: {
            toolName: "open_event_pricing",
            params: { eventId: event.id },
            label: "Set pricing for this event",
          },
        });
      }
    }

    // 5. Low-margin events
    for (const event of eventsData) {
      if (event.pricing_data?.projectedMargin !== undefined) {
        const margin = event.pricing_data.projectedMargin;
        if (margin < 0.2) {
          // Below 20% margin
          suggestions.push({
            id: `pricing-low-margin-${event.id}`,
            type: "warning",
            category: "pricing",
            title: `Low margin: ${event.name}`,
            description: `${event.name} has a projected margin of ${(margin * 100).toFixed(1)}%. Consider increasing price or reducing costs.`,
            urgency: "medium",
            actionable: true,
            relatedEntityId: event.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "review_pricing",
              params: { eventId: event.id },
              label: "Review and adjust pricing",
            },
          });
        }
      }
    }

    // 6. Cost changed since proposal sent (pricing mismatch)
    for (const proposal of proposalsData) {
      const event = eventsData.find((e) => e.id === proposal.event_id);
      if (!event) continue;

      if (proposal.status === "sent" && event.pricing_data) {
        // Compare proposal creation date with event's last update
        const proposalDate = new Date(proposal.created_at);
        const eventUpdateDate = new Date(event.updated_at);
        if (eventUpdateDate > proposalDate) {
          suggestions.push({
            id: `pricing-mismatch-${proposal.id}`,
            type: "warning",
            category: "pricing",
            title: `Pricing changed: ${event.name}`,
            description: `The event pricing was updated after the proposal was sent. You may need to send an updated proposal.`,
            urgency: "high",
            actionable: true,
            relatedEntityId: proposal.id,
            relatedEntityType: "proposal",
            suggestedAction: {
              toolName: "resend_proposal",
              params: { proposalId: proposal.id },
              label: "Send updated proposal",
            },
          });
        }
      }
    }

    // ─── CLIENT SUGGESTIONS ───

    // 7. Proposed events without response (7+ days)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (const event of eventsData) {
      if (event.status === "proposed") {
        const createdAt = new Date(event.created_at);
        if (createdAt < sevenDaysAgo) {
          const client = clientsData.find((c) => c.id === event.client_id);
          suggestions.push({
            id: `client-proposal-pending-${event.id}`,
            type: "action",
            category: "client",
            title: `Follow up: ${event.name}`,
            description: `${event.name} has been in proposed status for ${Math.floor((today.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000))} days. Consider following up with ${client?.first_name} ${client?.last_name || "the client"}.`,
            urgency: "medium",
            actionable: true,
            relatedEntityId: event.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "send_follow_up",
              params: { eventId: event.id, clientId: client?.id },
              label: "Send follow-up message",
            },
          });
        }
      }
    }

    // 8. Overdue invoices (30+ days)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const payment of paymentsData) {
      if (payment.status !== "paid" && payment.due_date) {
        const dueDate = new Date(payment.due_date);
        if (dueDate < thirtyDaysAgo) {
          const event = eventsData.find((e) => e.id === payment.event_id);
          suggestions.push({
            id: `client-overdue-${payment.id}`,
            type: "warning",
            category: "client",
            title: `Overdue payment: ${event?.name || "Unknown event"}`,
            description: `Invoice for ${event?.name} was due on ${dueDate.toLocaleDateString()} and remains unpaid.`,
            urgency: "high",
            actionable: true,
            relatedEntityId: event?.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "send_payment_reminder",
              params: { paymentId: payment.id },
              label: "Send payment reminder",
            },
          });
        }
      }
    }

    // 9. Events in next 7 days without proposal
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const event of eventsData) {
      const eventDate = new Date(event.event_date);
      if (eventDate >= today && eventDate <= in7Days && event.status !== "canceled") {
        const hasProposal = proposalsData.some((p) => p.event_id === event.id);
        if (!hasProposal) {
          suggestions.push({
            id: `client-missing-proposal-${event.id}`,
            type: "action",
            category: "client",
            title: `No proposal: ${event.name}`,
            description: `${event.name} is scheduled for ${new Date(event.event_date).toLocaleDateString()} but no proposal has been sent.`,
            urgency: "high",
            actionable: true,
            relatedEntityId: event.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "generate_proposal",
              params: { eventId: event.id },
              label: "Generate and send proposal",
            },
          });
        }
      }
    }

    // ─── OPERATIONS SUGGESTIONS ───

    // 10. Events in next 3 days without production sheet
    const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    for (const event of eventsData) {
      const eventDate = new Date(event.event_date);
      if (eventDate >= today && eventDate <= in3Days && event.status !== "canceled") {
        const { data: prodSheet } = await supabase
          .from("event_production_sheets")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id);

        if (!prodSheet || prodSheet.length === 0) {
          suggestions.push({
            id: `ops-missing-prod-sheet-${event.id}`,
            type: "warning",
            category: "operations",
            title: `No production sheet: ${event.name}`,
            description: `${event.name} is ${Math.floor((eventDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))} day(s) away but production sheet hasn't been generated yet.`,
            urgency: "critical",
            actionable: true,
            relatedEntityId: event.id,
            relatedEntityType: "event",
            suggestedAction: {
              toolName: "generate_production_sheet",
              params: { eventId: event.id },
              label: "Generate production sheet",
            },
          });
        }
      }
    }

    // ─── PROCUREMENT SUGGESTIONS ───

    // 11. Inventory items below par level needed for upcoming events
    for (const item of inventoryData) {
      if (item.par_level && item.quantity_on_hand < item.par_level) {
        const shortfall = item.par_level - item.quantity_on_hand;
        suggestions.push({
          id: `procurement-low-inventory-${item.id}`,
          type: "action",
          category: "procurement",
          title: `Low stock: ${item.ingredient_name}`,
          description: `${item.ingredient_name} is below par level. Current: ${item.quantity_on_hand} ${item.unit}, Par: ${item.par_level} ${item.unit}. Shortfall: ${shortfall.toFixed(1)} ${item.unit}.`,
          urgency: "medium",
          actionable: true,
          relatedEntityId: item.id,
          relatedEntityType: "inventory",
          suggestedAction: {
            toolName: "create_purchase_order",
            params: { ingredientId: item.id, quantity: shortfall },
            label: "Order to restore par level",
          },
        });
      }
    }

    // Sort by urgency and limit results
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort(
      (a, b) => urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]
    );

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return [];
  }
}

/**
 * Convert a suggestion into a pending action in the queue
 */
export async function actionizeSuggestion(
  userId: string,
  suggestion: CainSuggestion,
  orgId?: string | null
): Promise<{ success: boolean; actionId?: string; error?: string }> {
  if (!suggestion.actionable || !suggestion.suggestedAction) {
    return { success: false, error: "This suggestion is not actionable" };
  }

  // Map tool names to action types
  const actionTypeMap: Record<string, any> = {
    view_event: "update_event_status",
    view_staff: "assign_staff",
    open_event_pricing: "update_pricing",
    review_pricing: "update_pricing",
    resend_proposal: "send_proposal",
    send_follow_up: "send_message",
    send_payment_reminder: "send_payment_reminder",
    generate_proposal: "send_proposal",
    generate_production_sheet: "create_event",
    create_purchase_order: "create_purchase_order",
  };

  const actionType = actionTypeMap[suggestion.suggestedAction.toolName] || "send_message";

  return proposeAction(
    userId,
    {
      action_type: actionType as any,
      title: suggestion.suggestedAction.label,
      description: suggestion.description,
      payload: suggestion.suggestedAction.params as CainActionPayload,
      priority: suggestion.urgency === "critical" ? "urgent" : suggestion.urgency === "high" ? "high" : "normal",
      organization_id: orgId ?? undefined,
    },
    orgId
  );
}
