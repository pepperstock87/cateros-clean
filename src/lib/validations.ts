import { z } from "zod";

// ---- Event Schemas ----

export const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(200),
  client_name: z.string().min(1, "Client name is required").max(200),
  client_email: z.string().email("Invalid email address").nullable().optional().or(z.literal("")),
  client_phone: z.string().max(30).nullable().optional().or(z.literal("")),
  client_id: z.string().nullable().optional().or(z.literal("")),
  event_date: z.string().min(1, "Event date is required"),
  start_time: z.string().nullable().optional().or(z.literal("")),
  end_time: z.string().nullable().optional().or(z.literal("")),
  guest_count: z.number().int().min(1, "Guest count must be at least 1").max(10000, "Guest count seems too high"),
  venue: z.string().max(500).nullable().optional().or(z.literal("")),
  notes: z.string().max(5000).nullable().optional().or(z.literal("")),
});

export const updateEventSchema = createEventSchema;

// ---- Recipe Schemas ----

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required").max(200),
  category: z.string().min(1, "Category is required"),
  servings: z.number().int().min(1, "Servings must be at least 1").max(10000),
  prep_time: z.string().nullable().optional().or(z.literal("")),
  description: z.string().max(5000).nullable().optional().or(z.literal("")),
});

// ---- Pricing Validation ----

export const pricingInputSchema = z.object({
  guestCount: z.number().int().min(1, "Guest count must be at least 1"),
  adminPercent: z.number().min(0, "Admin fee cannot be negative").max(100, "Admin fee cannot exceed 100%"),
  taxPercent: z.number().min(0, "Tax cannot be negative").max(100, "Tax cannot exceed 100%"),
  targetMarginPercent: z.number().min(0, "Margin cannot be negative").max(99, "Margin cannot be 100% or more"),
});

// ---- Settings Schemas ----

export const businessDefaultsSchema = z.object({
  default_admin_fee: z.number().min(0).max(100),
  default_tax_rate: z.number().min(0).max(100),
  default_target_margin: z.number().min(0).max(99),
  default_deposit_percent: z.number().min(0).max(100),
  service_charge_percent: z.number().min(0).max(100),
});

// ---- Helpers ----

export function parseFormData(formData: FormData, schema: z.ZodSchema) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = typeof value === "string" ? value.trim() : value;
  }
  return schema.safeParse(raw);
}

/** Extract and validate event form data from FormData */
export function validateEventFormData(formData: FormData) {
  const raw = {
    name: (formData.get("name") as string)?.trim() || "",
    client_name: (formData.get("client_name") as string)?.trim() || "",
    client_email: (formData.get("client_email") as string)?.trim() || null,
    client_phone: (formData.get("client_phone") as string)?.trim() || null,
    client_id: (formData.get("client_id") as string)?.trim() || null,
    event_date: (formData.get("event_date") as string)?.trim() || "",
    start_time: (formData.get("start_time") as string)?.trim() || null,
    end_time: (formData.get("end_time") as string)?.trim() || null,
    guest_count: Number(formData.get("guest_count")) || 0,
    venue: (formData.get("venue") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  return createEventSchema.safeParse(raw);
}
