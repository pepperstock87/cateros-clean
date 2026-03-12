// Gusto Webhook Handler
//
// Receives webhook events from Gusto for payroll lifecycle events.
// Logs events and updates local state when payrolls are processed.

import { createClient } from "@/lib/supabase/server";
import { domainEvents } from "@/lib/events";
import type { PayrollWebhookEvent } from "./types";

/**
 * Process a Gusto webhook event.
 */
export async function processWebhook(event: PayrollWebhookEvent): Promise<void> {
  const supabase = await createClient();

  // Find the user associated with this company
  const { data: connection } = await supabase
    .from("payroll_connections")
    .select("user_id, organization_id")
    .eq("company_uuid", event.company_uuid)
    .eq("is_active", true)
    .maybeSingle();

  if (!connection) {
    console.log(`[payroll/webhooks] No connection found for company ${event.company_uuid}`);
    return;
  }

  switch (event.event_type) {
    case "payroll.processed": {
      // Find hours exports linked to this payroll period
      // and mark them as processed
      const { data: exports } = await supabase
        .from("payroll_hours_exports")
        .select("id, event_id, total_hours, total_labor_cost, line_items")
        .eq("user_id", connection.user_id)
        .eq("status", "approved");

      if (exports) {
        for (const exp of exports) {
          await supabase
            .from("payroll_hours_exports")
            .update({
              status: "processed",
              gusto_payroll_id: event.resource_uuid,
              updated_at: new Date().toISOString(),
            })
            .eq("id", exp.id);

          // Emit domain event
          await domainEvents.emit(
            "payroll.paid",
            {
              eventId: exp.event_id,
              userId: connection.user_id,
              orgId: connection.organization_id,
              externalPayrollId: event.resource_uuid,
              paidAt: event.timestamp,
            },
            "payroll/webhooks"
          );
        }
      }
      break;
    }

    case "payroll.reverted": {
      // Mark exports as needing re-export
      await supabase
        .from("payroll_hours_exports")
        .update({
          status: "approved", // back to approved, needs re-export
          gusto_payroll_id: null,
          notes: `Payroll ${event.resource_uuid} was reverted. Re-export needed.`,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", connection.user_id)
        .eq("gusto_payroll_id", event.resource_uuid);
      break;
    }

    case "employee.terminated": {
      // Deactivate the employee mapping
      await supabase
        .from("payroll_employee_mappings")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", connection.user_id)
        .eq("payroll_employee_id", event.resource_uuid);
      break;
    }

    default:
      // Log but don't act on other events
      console.log(
        `[payroll/webhooks] Received ${event.event_type} for company ${event.company_uuid}`
      );
  }
}
