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
  timeline: CainTimelineItem[];
  reasoning: string[];
  recipeMatches: Array<{
    menuItemName: string;
    recipeId: string | null;
    recipeName: string | null;
    confidence: "exact" | "partial" | "none";
    draftRecipeId?: string;
  }>;
  draftRecipes: CainDraftRecipe[];
  shoppingList: CainShoppingList | null;
  prepPreview: CainPrepPreview | null;
  marginAnalysis: CainMarginAnalysis | null;
  procurementDraft: CainProcurementDraft | null;
  inventoryWarnings: Array<{
    ingredient: string;
    needed: number;
    available: number;
    unit: string;
  }>;
  assumptions: string[];
  questions: string[];
}

export interface CainDraftRecipe {
  id: string;
  menuItemName: string;
  recipe: {
    name: string;
    description: string;
    category: string;
    servings: number;
    ingredients: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      cost_per_unit: number;
      total_cost: number;
    }>;
    total_cost: number;
    cost_per_serving: number;
  };
  approved: boolean;
  savedRecipeId?: string;
}

// ---------- Margin Analysis ----------

export interface CainCostFlag {
  type: "high_food_cost" | "low_margin" | "labor_heavy" | "price_below_cost" | "inventory_conflict";
  severity: "warning" | "critical";
  message: string;
  suggestion?: string;
}

export interface CainMarginAnalysis {
  foodCostPercent: number;
  laborCostPercent: number;
  rentalsCostPercent: number;
  totalCostPerGuest: number;
  pricePerGuest: number;
  marginPercent: number;
  costFlags: CainCostFlag[];
  pastEventComparison: {
    avgMargin: number | null;
    avgPricePerGuest: number | null;
    avgFoodCostPercent: number | null;
    eventCount: number;
  } | null;
  inventoryCredit: number;
}

// ---------- Shopping List ----------

export type IngredientCategory =
  | "Proteins"
  | "Dairy"
  | "Produce"
  | "Herbs & Spices"
  | "Dry Goods"
  | "Oils & Vinegars"
  | "Beverages"
  | "Miscellaneous";

export interface CainShoppingItem {
  ingredientName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  category: IngredientCategory;
  fromRecipes: string[];
  inventoryOnHand?: number;
  inventoryStatus?: "sufficient" | "partial" | "need_to_order";
  shortfall?: number;
  purchaseQuantity?: number;
}

export interface CainShoppingList {
  items: CainShoppingItem[];
  totalEstimatedCost: number;
  totalItems: number;
  categoryCounts: Partial<Record<IngredientCategory, number>>;
  purchaseCost?: number;
  inventoryCredit?: number;
}

// ---------- Procurement ----------

export interface CainPOLine {
  ingredientName: string;
  quantity: number;
  unit: string;
  distributorName: string;
  distributorId: string;
  sku: string;
  productName: string;
  packSize: string;
  unitPrice: number;
  extendedPrice: number;
  isPreferred: boolean;
}

export interface CainProcurementDraft {
  byDistributor: Record<string, {
    distributorName: string;
    distributorId: string;
    lines: CainPOLine[];
    subtotal: number;
  }>;
  unmappedItems: Array<{ ingredientName: string; quantity: number; unit: string }>;
  totalDistributors: number;
  totalMappedItems: number;
  totalEstimatedCost: number;
}

// ---------- Timeline ----------

export interface CainTimelineItem {
  phase: string;
  task: string;
  start_time?: string;
  duration_minutes?: number;
  assigned_to?: string;
  notes?: string;
}

// ---------- Event Patterns ----------

export interface CainEventPattern {
  eventId: string;
  eventName: string;
  eventDate: string;
  similarityScore: number;
  guestCount: number;
  margin: number | null;
  menuHighlights: string[];
  staffingSummary: string;
  pricePerGuest: number | null;
}

// ---------- Prep Preview ----------

export interface CainPrepItem {
  menuItemName: string;
  recipeName: string;
  componentName: string;
  quantity: number;
  unit: string;
  station: string | null;
  prepNotes: string | null;
}

export interface CainPrepPreview {
  byStation: Record<string, CainPrepItem[]>;
  byDish: Array<{
    dishName: string;
    category: string;
    scaleFactor: number;
    items: CainPrepItem[];
  }>;
  totalTasks: number;
  stationCounts: Record<string, number>;
}

// ---------- Extracted Entities ----------

export type ExtractionConfidence = "confirmed" | "inferred" | "assumed";

export interface ExtractedEntity {
  key: string;
  value: string | number | null;
  confidence: ExtractionConfidence;
  source: string; // e.g. "user_turn_3", "lookup_clients"
  updatedAt: number;
}

export interface ExtractedEntities {
  event: Record<string, ExtractedEntity>;
  client: Record<string, ExtractedEntity>;
  menu: ExtractedEntity[];
  staffing: ExtractedEntity[];
  rentals: ExtractedEntity[];
  timeline: ExtractedEntity[];
  budget?: ExtractedEntity;
  serviceStyle?: ExtractedEntity;
}

// ---------- Draft Snapshot ----------

export interface CainDraftSnapshot {
  draftId: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  plan: CainEventPlan | null;
  showReview: boolean;
  lastInput: string;
  updatedAt: number;
  extractedEntities: ExtractedEntities | null;
}

export type CainProgressEvent =
  | { type: "thinking"; message: string }
  | { type: "tool_start"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; summary: string }
  | { type: "plan_ready"; plan: CainEventPlan }
  | { type: "entity_update"; entities: Partial<ExtractedEntities>; fullSnapshot: ExtractedEntities }
  | { type: "margin_analysis"; analysis: CainMarginAnalysis }
  | { type: "error"; message: string }
  | { type: "text_delta"; text: string };
