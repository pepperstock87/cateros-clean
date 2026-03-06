export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "trialing" | "canceled" | "past_due" | null;
  plan_tier: "basic" | "pro" | null;
  created_at: string;
};

export type Event = {
  id: string;
  user_id: string;
  name: string;
  client_name: string;
  client_email: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number;
  venue: string | null;
  client_phone: string | null;
  notes: string | null;
  status: "draft" | "proposed" | "confirmed" | "completed" | "canceled";
  pricing_data: PricingData | null;
  created_at: string;
  updated_at: string;
};

export type PricingData = {
  guestCount: number;
  menuItems: MenuItem[];
  staffing: StaffingLine[];
  rentals: RentalLine[];
  barPackage: BarPackage | null;
  adminPercent: number;
  taxPercent: number;
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
  targetMarginPercent: number;
};

export type MenuItem = {
  id: string;
  name: string;
  costPerPerson: number;
  quantity: number;
};

export type StaffingLine = {
  id: string;
  role: string;
  hourlyRate: number;
  hours: number;
  headcount: number;
};

export type RentalLine = {
  id: string;
  item: string;
  unitCost: number;
  quantity: number;
};

export type BarPackage = {
  type: "beer_wine" | "full_bar" | "custom";
  costPerPerson: number;
  label: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  servings: number;
  category: string | null;
  ingredients: RecipeIngredient[];
  total_cost: number;
  cost_per_serving: number;
  case_price: number | null;
  units_per_case: number | null;
  case_unit_type: string | null;
  yield_percent: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
};

export type BusinessSettings = {
  user_id: string;
  business_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  proposal_terms: string | null;
  proposal_template: "simple" | "modern";
  created_at: string;
  updated_at: string;
};

export type Proposal = {
  id: string;
  user_id: string;
  event_id: string;
  title: string;
  status: "draft" | "sent" | "accepted" | "declined";
  custom_message: string | null;
  terms: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  event?: Event; // joined data
};

export type UserEntitlements = {
  plan: "basic" | "pro";
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | "none";
  isPro: boolean;
};
