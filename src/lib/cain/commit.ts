import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { logActivity } from "@/lib/activity";
import type { CainEventPlan } from "./types";
import type { PricingData } from "@/types";

export async function commitCainPlan(params: {
  plan: CainEventPlan;
  userId: string;
  orgId: string | null;
}): Promise<{ success: true; eventId: string } | { error: string }> {
  const { plan, userId, orgId } = params;

  try {
    const supabase = await createClient();

    // Build pricing_data to match PricingData type
    const pricingData: PricingData = {
      guestCount: plan.pricing.guestCount,
      menuItems: plan.pricing.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        costPerPerson: item.costPerPerson,
        quantity: item.quantity,
        category: item.category as PricingData["menuItems"][number]["category"],
      })),
      staffing: plan.pricing.staffing,
      rentals: plan.pricing.rentals,
      barPackage: plan.pricing.barPackage as PricingData["barPackage"],
      adminPercent: plan.pricing.adminPercent,
      taxPercent: plan.pricing.taxPercent,
      foodCostTotal: plan.pricing.foodCostTotal,
      staffingTotal: plan.pricing.staffingTotal,
      rentalsTotal: plan.pricing.rentalsTotal,
      barTotal: plan.pricing.barTotal,
      subtotal: plan.pricing.subtotal,
      adminFee: plan.pricing.adminFee,
      taxAmount: plan.pricing.taxAmount,
      totalCost: plan.pricing.totalCost,
      suggestedPrice: plan.pricing.suggestedPrice,
      projectedMargin: plan.pricing.projectedMargin,
      targetMarginPercent: plan.pricing.targetMarginPercent,
    };

    // Insert the event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        organization_id: orgId,
        name: plan.event.name,
        client_name: plan.event.client_name,
        client_email: plan.event.client_email || null,
        client_phone: plan.event.client_phone || null,
        client_id: plan.event.client_id || null,
        event_date: plan.event.event_date,
        start_time: plan.event.start_time || null,
        end_time: plan.event.end_time || null,
        guest_count: plan.event.guest_count,
        venue: plan.event.venue || null,
        notes: plan.event.notes || null,
        status: "draft",
        pricing_data: pricingData,
      })
      .select()
      .single();

    if (eventError) {
      return { error: eventError.message };
    }

    // Insert timeline items if present
    if (plan.timeline && plan.timeline.length > 0) {
      const timelineRows = plan.timeline.map((item, index) => ({
        event_id: event.id,
        phase: item.phase,
        task: item.task,
        start_time: item.start_time || null,
        duration_minutes: item.duration_minutes || null,
        assigned_to: item.assigned_to || null,
        notes: item.notes || null,
        sort_order: index,
      }));

      const { error: timelineError } = await supabase
        .from("event_timeline_items")
        .insert(timelineRows);

      if (timelineError) {
        // Log but don't fail the whole operation — the event was already created
        console.error("Failed to insert timeline items:", timelineError.message);
      }
    }

    // Log activity
    await logActivity(event.id, userId, "event_created", `Event "${event.name}" created via C.A.I.N.`, {
      client: plan.event.client_name,
      guest_count: plan.event.guest_count,
      source: "cain",
    });

    // Fire-and-forget audit log
    logAudit({
      userId,
      action: "create",
      entity: "event",
      entityId: event.id,
      entityName: event.name,
      details: {
        client: plan.event.client_name,
        guest_count: plan.event.guest_count,
        source: "cain",
      },
      organizationId: orgId,
    });

    return { success: true, eventId: event.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to commit plan";
    return { error: message };
  }
}
