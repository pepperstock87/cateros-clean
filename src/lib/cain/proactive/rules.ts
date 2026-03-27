/**
 * Proactive Rules — Time-based triggers for business operations
 * Each rule queries Supabase and returns potential actions
 */

import { createClient } from "@/lib/supabase/server";
import type { ProactiveRule, ProactiveAction } from "./types";

/**
 * Payment Reminder (7-day lookhead)
 * For events happening in 7 days with outstanding balance
 */
export const paymentReminder7day: ProactiveRule = {
  id: "payment_reminder_7day",
  name: "Payment Reminder — 7 Days Out",
  description: "Propose sending payment reminders for events in 7 days with outstanding balance",
  schedule: "daily",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("events")
      .select("id, name, event_date, client_email, pricing_data")
      .eq("user_id", userId)
      .neq("status", "canceled")
      .gte("event_date", today.toISOString())
      .lte("event_date", in7Days.toISOString());

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: events, error } = await query;

    if (error || !events) return actions;

    for (const event of events) {
      const pricing = event.pricing_data as any;
      const outstandingBalance = pricing?.suggestedPrice ? (pricing.suggestedPrice - (pricing.amountPaid || 0)) : 0;

      if (outstandingBalance > 0 && event.client_email) {
        // Check if action already exists for this event
        const { data: existing } = await supabase
          .from("cain_pending_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "send_payment_reminder")
          .eq("status", "pending")
          .contains("payload", { eventId: event.id });

        if (existing && existing.length > 0) continue; // Skip if already pending

        actions.push({
          ruleId: "payment_reminder_7day",
          ruleName: "Payment Reminder — 7 Days Out",
          actionType: "send_payment_reminder",
          title: `Send payment reminder for ${event.name}`,
          description: `${event.name} is in 7 days with $${outstandingBalance.toFixed(2)} outstanding. Send reminder to ${event.client_email}.`,
          priority: "normal",
          payload: {
            type: "send_payment_reminder",
            invoiceId: event.id,
            clientEmail: event.client_email,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Staffing Check (3-day lookhead)
 * Events in 3 days with 0 staff assigned
 */
export const staffingCheck3day: ProactiveRule = {
  id: "staffing_check_3day",
  name: "Staffing Check — 3 Days Out",
  description: "Propose opening staffing view for events in 3 days with no staff assigned",
  schedule: "daily",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    const today = new Date();
    const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("events")
      .select("id, name, event_date, guest_count")
      .eq("user_id", userId)
      .neq("status", "canceled")
      .gte("event_date", today.toISOString())
      .lte("event_date", in3Days.toISOString());

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: events, error } = await query;

    if (error || !events) return actions;

    for (const event of events) {
      const { data: staffAssignments } = await supabase
        .from("event_staff_assignments")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);

      const staffCount = staffAssignments?.length ?? 0;

      if (staffCount === 0) {
        // Check if action already exists
        const { data: existing } = await supabase
          .from("cain_pending_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "assign_staff")
          .eq("status", "pending")
          .contains("payload", { eventId: event.id });

        if (existing && existing.length > 0) continue;

        actions.push({
          ruleId: "staffing_check_3day",
          ruleName: "Staffing Check — 3 Days Out",
          actionType: "assign_staff",
          title: `Assign staff to ${event.name}`,
          description: `${event.name} is in 3 days with 0 staff assigned for ${event.guest_count} guests. Open staffing view to assign team members.`,
          priority: "high",
          payload: {
            type: "assign_staff",
            eventId: event.id,
            staffMemberId: "",
            role: "general",
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Proposal Followup (5-day lookhead)
 * Proposals sent 5+ days ago with no response (status still "sent")
 */
export const proposalFollowup5day: ProactiveRule = {
  id: "proposal_followup_5day",
  name: "Proposal Followup — 5 Days",
  description: "Propose follow-up emails for proposals sent 5+ days ago without response",
  schedule: "daily",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    let query = supabase
      .from("proposals")
      .select("id, event_id, created_at, events(name, client_email)")
      .eq("user_id", userId)
      .eq("status", "sent")
      .lt("created_at", fiveDaysAgo.toISOString());

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: proposals, error } = await query;

    if (error || !proposals) return actions;

    for (const proposal of proposals) {
      const event = (proposal as any).events;
      if (!event) continue;

      // Check if action already exists
      const { data: existing } = await supabase
        .from("cain_pending_actions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "send_message")
        .eq("status", "pending")
        .contains("payload", { proposalId: proposal.id });

      if (existing && existing.length > 0) continue;

      actions.push({
        ruleId: "proposal_followup_5day",
        ruleName: "Proposal Followup — 5 Days",
        actionType: "send_message",
        title: `Follow up on proposal for ${event.name}`,
        description: `Proposal for ${event.name} was sent 5+ days ago. Consider sending a follow-up email to ${event.client_email}.`,
        priority: "normal",
        payload: {
          type: "send_message",
          recipientId: proposal.event_id,
          recipientEmail: event.client_email,
          message: `Follow-up: Are you still interested in ${event.name}?`,
          messageType: "email",
        },
      });
    }

    return actions;
  },
};

/**
 * Production Sheet (2-day lookhead)
 * Events in 2 days without production sheet
 */
export const productionSheet2day: ProactiveRule = {
  id: "production_sheet_2day",
  name: "Production Sheet — 2 Days Out",
  description: "Propose generating production sheets for events in 2 days without one",
  schedule: "daily",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    const today = new Date();
    const in2Days = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("events")
      .select("id, name, event_date")
      .eq("user_id", userId)
      .neq("status", "canceled")
      .gte("event_date", today.toISOString())
      .lte("event_date", in2Days.toISOString());

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: events, error } = await query;

    if (error || !events) return actions;

    for (const event of events) {
      const { data: prodSheet } = await supabase
        .from("event_production_sheets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);

      if (!prodSheet || prodSheet.length === 0) {
        // Check if action already exists
        const { data: existing } = await supabase
          .from("cain_pending_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "create_event")
          .eq("status", "pending")
          .contains("payload", { eventId: event.id });

        if (existing && existing.length > 0) continue;

        actions.push({
          ruleId: "production_sheet_2day",
          ruleName: "Production Sheet — 2 Days Out",
          actionType: "create_event",
          title: `Generate production sheet for ${event.name}`,
          description: `${event.name} is in 2 days without a production sheet. Generate it now to ensure readiness.`,
          priority: "urgent",
          payload: {
            type: "create_event",
            name: `Production Sheet: ${event.name}`,
            clientName: "Internal",
            eventDate: event.event_date,
            guestCount: 0,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * Event Confirmation (7-8 day lookhead)
 * Events in 7-8 days should be confirmed
 */
export const eventConfirmation1week: ProactiveRule = {
  id: "event_confirmation_1week",
  name: "Event Confirmation — 1 Week Out",
  description: "Propose sending event confirmation emails 7-8 days before event",
  schedule: "weekly",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in8Days = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("events")
      .select("id, name, event_date, client_email")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("event_date", in7Days.toISOString())
      .lte("event_date", in8Days.toISOString());

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: events, error } = await query;

    if (error || !events) return actions;

    for (const event of events) {
      if (!event.client_email) continue;

      // Check if action already exists
      const { data: existing } = await supabase
        .from("cain_pending_actions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_type", "send_message")
        .eq("status", "pending")
        .contains("payload", { eventId: event.id, messageType: "confirmation" });

      if (existing && existing.length > 0) continue;

      actions.push({
        ruleId: "event_confirmation_1week",
        ruleName: "Event Confirmation — 1 Week Out",
        actionType: "send_message",
        title: `Send confirmation to client for ${event.name}`,
        description: `${event.name} is confirmed for 7-8 days from now. Send final confirmation email to ${event.client_email}.`,
        priority: "normal",
        payload: {
          type: "send_message",
          recipientId: event.id,
          recipientEmail: event.client_email,
          message: `Confirmation: We're all set for ${event.name}!`,
          messageType: "email",
        },
      });
    }

    return actions;
  },
};

/**
 * Inventory Restock (weekly)
 * Items below par level
 */
export const inventoryRestock: ProactiveRule = {
  id: "inventory_restock",
  name: "Inventory Restock Check",
  description: "Propose creating purchase orders for inventory items below par level",
  schedule: "weekly",
  enabled: true,
  check: async (userId: string, orgId: string | null) => {
    const supabase = await createClient();
    const actions: ProactiveAction[] = [];

    let query = supabase
      .from("inventory")
      .select("id, ingredient_name, quantity_on_hand, par_level, unit")
      .eq("user_id", userId);

    if (orgId) query = query.eq("organization_id", orgId);

    const { data: items, error } = await query;

    if (error || !items) return actions;

    for (const item of items) {
      if (item.par_level && item.quantity_on_hand < item.par_level) {
        const shortfall = item.par_level - item.quantity_on_hand;

        // Check if action already exists
        const { data: existing } = await supabase
          .from("cain_pending_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("action_type", "create_purchase_order")
          .eq("status", "pending")
          .contains("payload", { inventoryItemId: item.id });

        if (existing && existing.length > 0) continue;

        actions.push({
          ruleId: "inventory_restock",
          ruleName: "Inventory Restock Check",
          actionType: "create_purchase_order",
          title: `Restock ${item.ingredient_name}`,
          description: `${item.ingredient_name} is below par level. Current: ${item.quantity_on_hand} ${item.unit}, Par: ${item.par_level} ${item.unit}. Shortfall: ${shortfall.toFixed(1)} ${item.unit}.`,
          priority: "normal",
          payload: {
            type: "create_purchase_order",
            inventoryItemId: item.id,
            quantity: shortfall,
            unit: item.unit,
          },
        });
      }
    }

    return actions;
  },
};

/**
 * All defined rules
 */
export const ALL_RULES: ProactiveRule[] = [
  paymentReminder7day,
  staffingCheck3day,
  proposalFollowup5day,
  productionSheet2day,
  eventConfirmation1week,
  inventoryRestock,
];
