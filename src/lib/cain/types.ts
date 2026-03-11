export interface CainEventPlan {
  id: string;
  status: "generating" | "ready" | "committed" | "failed";
  brief: string;
  event: {
    name: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    client_id?: string;
    event_date: string;
    start_time?: string;
    end_time?: string;
    guest_count: number;
    venue?: string;
    notes?: string;
    event_type?: string;
  };
  pricing: {
    guestCount: number;
    menuItems: Array<{ id: string; name: string; costPerPerson: number; quantity: number; category?: string }>;
    staffing: Array<{ id: string; role: string; hourlyRate: number; hours: number; headcount: number }>;
    rentals: Array<{ id: string; item: string; unitCost: number; quantity: number }>;
    barPackage: { type: string; costPerPerson: number; label: string } | null;
    adminPercent: number;
    taxPercent: number;
    targetMarginPercent: number;
    foodCostTotal: number;
    staffingTotal: number;
    rentalsTotal: number;
    barTotal: number;
    subtotal: number;
    adminFee: number;
    taxAmount: number;
    totalCost: number;
    suggestedPrice: number;
    projectedMargin: number;
  };
  timeline: Array<{
    phase: string;
    task: string;
    start_time?: string;
    duration_minutes?: number;
    assigned_to?: string;
    notes?: string;
  }>;
  reasoning: string[];
  recipeMatches: Array<{
    menuItemName: string;
    recipeId: string | null;
    recipeName: string | null;
    confidence: "exact" | "partial" | "none";
  }>;
  inventoryWarnings: Array<{
    ingredient: string;
    needed: number;
    available: number;
    unit: string;
  }>;
  assumptions: string[];
  questions: string[];
}

export type CainProgressEvent =
  | { type: "thinking"; message: string }
  | { type: "tool_start"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string }
  | { type: "plan_ready"; plan: CainEventPlan }
  | { type: "error"; message: string }
  | { type: "text_delta"; text: string };
