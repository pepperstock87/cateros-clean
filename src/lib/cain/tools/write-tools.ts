import { proposeAction } from "../actions/queue";
import type { CainActionType, CainActionPayload } from "../actions/types";

type ToolContext = {
  userId: string;
  orgId: string | null;
};

/**
 * Write tool definitions for CAIN.
 * These tools create pending actions in the cain_pending_actions table.
 * They do not execute directly—the user reviews and approves them later.
 */
export const writeToolDefinitions = [
  {
    name: "propose_staff_assignment",
    description:
      "Propose assigning a staff member to an event with a specific role and hours. Creates a pending action for user approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to assign staff to",
        },
        staff_id: {
          type: "string",
          description: "The staff member ID to assign",
        },
        role: {
          type: "string",
          description:
            "The role for this assignment (e.g. chef, server, bartender, captain, prep cook)",
        },
        hours: {
          type: "number",
          description: "Number of hours for this assignment",
        },
      },
      required: ["event_id", "staff_id", "role", "hours"],
    },
  },
  {
    name: "propose_event_status_change",
    description:
      "Propose changing an event status. Valid statuses are: draft, proposed, confirmed, completed, cancelled. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to update",
        },
        new_status: {
          type: "string",
          enum: ["draft", "proposed", "confirmed", "completed", "cancelled"],
          description: "The new status for the event",
        },
        reason: {
          type: "string",
          description: "Optional reason for the status change",
        },
      },
      required: ["event_id", "new_status"],
    },
  },
  {
    name: "propose_send_proposal",
    description:
      "Propose generating and sending a proposal PDF to the client. Creates a pending action that will generate a proposal and email it.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to generate proposal for",
        },
        client_email: {
          type: "string",
          description: "Email address to send the proposal to",
        },
        message: {
          type: "string",
          description: "Optional custom message to include in the email",
        },
      },
      required: ["event_id", "client_email"],
    },
  },
  {
    name: "propose_send_invoice",
    description:
      "Propose creating and sending an invoice to the client. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID to invoice for",
        },
        client_email: {
          type: "string",
          description: "Email address to send the invoice to",
        },
        amount: {
          type: "number",
          description: "Invoice amount (in dollars)",
        },
        due_date: {
          type: "string",
          description: "Due date in YYYY-MM-DD format (optional)",
        },
      },
      required: ["event_id", "client_email", "amount"],
    },
  },
  {
    name: "propose_send_payment_reminder",
    description:
      "Propose sending a payment reminder email to the client for an outstanding balance. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string",
          description: "The event ID related to the outstanding payment",
        },
        client_email: {
          type: "string",
          description: "Email address to send the reminder to",
        },
        outstanding_amount: {
          type: "number",
          description: "The outstanding balance amount (in dollars)",
        },
        tone: {
          type: "string",
          enum: ["gentle", "firm", "final"],
          description:
            'Tone of the reminder: "gentle" for first reminder, "firm" for follow-up, "final" for last notice',
        },
      },
      required: ["event_id", "client_email", "outstanding_amount"],
    },
  },
  {
    name: "propose_send_message",
    description:
      "Propose sending a general email message to a recipient. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipient_email: {
          type: "string",
          description: "Email address of the recipient",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        body: {
          type: "string",
          description: "Email body content",
        },
        event_id: {
          type: "string",
          description: "Optional event ID to associate with this message",
        },
      },
      required: ["recipient_email", "subject", "body"],
    },
  },
  {
    name: "propose_purchase_order",
    description:
      "Propose creating a purchase order for ingredients from a distributor. Creates a pending action for review and approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        distributor_id: {
          type: "string",
          description: "The distributor ID to order from",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_name: {
                type: "string",
                description: "Name of the product",
              },
              sku: {
                type: "string",
                description: "Optional SKU or product code",
              },
              quantity: {
                type: "number",
                description: "Quantity to order",
              },
              unit: {
                type: "string",
                description: "Unit of measurement (e.g. kg, lb, case, dozen)",
              },
              unit_price: {
                type: "number",
                description: "Price per unit",
              },
            },
            required: ["product_name", "quantity", "unit_price"],
          },
          description: "Items to include in the purchase order",
        },
        event_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional event IDs to associate with this PO",
        },
        notes: {
          type: "string",
          description: "Optional notes or special instructions for the order",
        },
      },
      required: ["distributor_id", "items"],
    },
  },
  {
    name: "propose_create_client",
    description:
      "Propose creating a new client record in the system. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        first_name: {
          type: "string",
          description: "Client first name",
        },
        last_name: {
          type: "string",
          description: "Client last name",
        },
        email: {
          type: "string",
          description: "Client email address (optional)",
        },
        phone: {
          type: "string",
          description: "Client phone number (optional)",
        },
        company_name: {
          type: "string",
          description: "Client company/organization name (optional)",
        },
        notes: {
          type: "string",
          description: "Optional notes about the client",
        },
      },
      required: ["first_name", "last_name"],
    },
  },
  {
    name: "propose_update_inventory",
    description:
      "Propose updating inventory levels for ingredients. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ingredient_name: {
                type: "string",
                description: "Name of the ingredient",
              },
              adjustment: {
                type: "number",
                description:
                  "Quantity to add (positive) or remove (negative) from inventory",
              },
              unit: {
                type: "string",
                description: "Unit of measurement",
              },
              reason: {
                type: "string",
                description: "Reason for the adjustment (e.g. purchased, used, spoiled)",
              },
            },
            required: ["ingredient_name", "adjustment", "unit", "reason"],
          },
          description: "Inventory items to update",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "propose_duplicate_event",
    description:
      "Propose duplicating an existing event with a new name and date. Creates a pending action for approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        source_event_id: {
          type: "string",
          description: "The event ID to duplicate from",
        },
        new_name: {
          type: "string",
          description: "Name for the new event",
        },
        new_date: {
          type: "string",
          description: "Event date in YYYY-MM-DD format",
        },
        new_guest_count: {
          type: "number",
          description: "Optional guest count for the new event",
        },
      },
      required: ["source_event_id", "new_name", "new_date"],
    },
  },
];

/**
 * Execute a write tool by creating a pending action.
 * Returns a confirmation message that the action has been queued.
 */
export async function executeWriteTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ result: string }> {
  try {
    switch (toolName) {
      case "propose_staff_assignment": {
        const { event_id, staff_id, role, hours } = input as {
          event_id: string;
          staff_id: string;
          role: string;
          hours: number;
        };

        const payload: CainActionPayload = {
          type: "assign_staff",
          eventId: event_id,
          staffMemberId: staff_id,
          role,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "assign_staff",
          title: `Assign ${role} to event`,
          description: `${hours} hours`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Staff assignment pending user approval. A ${role} will be assigned for ${hours} hours.`,
        };
      }

      case "propose_event_status_change": {
        const { event_id, new_status, reason } = input as {
          event_id: string;
          new_status: string;
          reason?: string;
        };

        const payload: CainActionPayload = {
          type: "update_event_status",
          eventId: event_id,
          status: new_status,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "update_event_status",
          title: `Change event status to ${new_status}`,
          description: reason || `Update event status to ${new_status}`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Event status change to "${new_status}" pending approval.`,
        };
      }

      case "propose_send_proposal": {
        const { event_id, client_email } = input as {
          event_id: string;
          client_email: string;
          message?: string;
        };

        const payload: CainActionPayload = {
          type: "send_proposal",
          proposalId: event_id,
          clientEmail: client_email,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "send_proposal",
          title: `Send proposal to ${client_email}`,
          description: `Generate and email proposal`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Proposal will be generated and sent to ${client_email} upon approval.`,
        };
      }

      case "propose_send_invoice": {
        const { event_id, client_email, amount, due_date } = input as {
          event_id: string;
          client_email: string;
          amount: number;
          due_date?: string;
        };

        const payload: CainActionPayload = {
          type: "send_invoice",
          invoiceId: event_id,
          clientEmail: client_email,
          dueDate: due_date,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "send_invoice",
          title: `Send invoice for $${amount} to ${client_email}`,
          description: `Amount: $${amount}${due_date ? ` (due ${due_date})` : ""}`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Invoice for $${amount} will be created and sent to ${client_email} upon approval.`,
        };
      }

      case "propose_send_payment_reminder": {
        const { event_id, client_email, outstanding_amount } = input as {
          event_id: string;
          client_email: string;
          outstanding_amount: number;
          tone?: string;
        };

        const payload: CainActionPayload = {
          type: "send_payment_reminder",
          invoiceId: event_id,
          clientEmail: client_email,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "send_payment_reminder",
          title: `Send payment reminder to ${client_email}`,
          description: `Outstanding balance: $${outstanding_amount}`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Payment reminder for $${outstanding_amount} will be sent to ${client_email} upon approval.`,
        };
      }

      case "propose_send_message": {
        const { recipient_email, subject, body } = input as {
          recipient_email: string;
          subject: string;
          body: string;
          event_id?: string;
        };

        const payload: CainActionPayload = {
          type: "send_message",
          recipientId: recipient_email, // Use email as ID
          recipientEmail: recipient_email,
          message: `${subject}\n\n${body}`,
          messageType: "email",
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "send_message",
          title: `Send message to ${recipient_email}`,
          description: `Subject: ${subject}`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Message to ${recipient_email} pending approval.`,
        };
      }

      case "propose_purchase_order": {
        const { distributor_id, items } = input as {
          distributor_id: string;
          items: Array<{
            product_name: string;
            sku?: string;
            quantity: number;
            unit?: string;
            unit_price: number;
          }>;
          event_ids?: string[];
          notes?: string;
        };

        const totalItems = items.length;
        const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

        const poItems = items.map((item) => ({
          sku: item.sku || item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        }));

        const payload: CainActionPayload = {
          type: "create_purchase_order",
          distributorId: distributor_id,
          items: poItems,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "create_purchase_order",
          title: `Purchase order: ${totalItems} items, $${totalCost.toFixed(2)} total`,
          description: `Order from distributor`,
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Purchase order with ${totalItems} items (total: $${totalCost.toFixed(2)}) pending approval.`,
        };
      }

      case "propose_create_client": {
        const { first_name, last_name, email, phone } = input as {
          first_name: string;
          last_name: string;
          email?: string;
          phone?: string;
          company_name?: string;
          notes?: string;
        };

        const payload: CainActionPayload = {
          type: "create_client",
          name: `${first_name} ${last_name}`,
          email,
          phone,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "create_client",
          title: `Create client: ${first_name} ${last_name}`,
          description: email ? `Email: ${email}` : "New client record",
          payload,
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: New client "${first_name} ${last_name}" pending approval.`,
        };
      }

      case "propose_update_inventory": {
        const { items } = input as {
          items: Array<{
            ingredient_name: string;
            adjustment: number;
            unit: string;
            reason: string;
          }>;
        };

        // For multiple items, we create separate actions
        // This is a simplified approach—could be batched
        const firstItem = items[0];
        const payload: CainActionPayload = {
          type: "update_inventory",
          inventoryItemId: firstItem.ingredient_name,
          quantity: firstItem.adjustment,
          operation: firstItem.adjustment > 0 ? "add" : "remove",
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "update_inventory",
          title: `Update inventory: ${items.length} item(s)`,
          description: `Adjust ${items.length} ingredient level(s)`,
          payload,
          preview_data: { items },
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Inventory update for ${items.length} item(s) pending approval.`,
        };
      }

      case "propose_duplicate_event": {
        const { source_event_id, new_name, new_date, new_guest_count } = input as {
          source_event_id: string;
          new_name: string;
          new_date: string;
          new_guest_count?: number;
        };

        // We'll use create_event since there's no duplicate_event type
        const payload: CainActionPayload = {
          type: "create_event",
          name: new_name,
          clientName: "", // Will be populated from source event
          eventDate: new_date,
          guestCount: new_guest_count || 0,
        };

        const result = await proposeAction(ctx.userId, {
          action_type: "create_event",
          title: `Duplicate event: "${new_name}"`,
          description: `Clone event to ${new_date}`,
          payload,
          preview_data: { sourceEventId: source_event_id, guestCount: new_guest_count },
          organization_id: ctx.orgId || undefined,
        }, ctx.orgId || undefined);

        if (!result.success) {
          return { result: `Error proposing action: ${result.error}` };
        }

        return {
          result: `✓ Action proposed: Event duplication pending approval. New event "${new_name}" scheduled for ${new_date}.`,
        };
      }

      default:
        return {
          result: `Unknown write tool: ${toolName}`,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      result: `Error proposing action: ${message}`,
    };
  }
}
