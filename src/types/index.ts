export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "trialing" | "canceled" | "past_due" | null;
  plan_tier: "basic" | "pro" | null;
  current_organization_id: string | null;
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
  organization_id?: string | null;
  pricing_data: PricingData | null;
  payment_data: PaymentData | null;
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
  organization_id?: string | null;
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
  organization_id?: string | null;
  business_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  proposal_terms: string | null;
  proposal_template: "simple" | "modern";
  brand_color: string | null;
  default_admin_fee: number | null;
  default_tax_rate: number | null;
  default_target_margin: number | null;
  default_deposit_percent: number | null;
  payment_terms: string | null;
  cancellation_policy: string | null;
  tax_id: string | null;
  service_charge_percent: number | null;
  notification_email: boolean;
  notification_proposals: boolean;
  notification_payments: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientMessage = {
  id: string;
  from: "client" | "caterer";
  message: string;
  action?: "accepted" | "declined" | "revision_requested";
  created_at: string;
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
  share_token: string | null;
  client_messages: ClientMessage[];
  revision_number: number;
  organization_id?: string | null;
  revision_notes: string | null;
  parent_proposal_id: string | null;
  created_at: string;
  updated_at: string;
  event?: Event; // joined data
};

export type PaymentRecord = {
  id: string;
  amount: number;
  method: "cash" | "check" | "card" | "venmo" | "zelle" | "wire" | "other";
  date: string;
  note: string;
};

export type PaymentData = {
  depositRequired: number;
  payments: PaymentRecord[];
  totalPaid: number;
};

export type StaffMember = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  role: string;
  hourly_rate: number;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type RentalItem = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  category: string | null;
  unit_cost: number;
  vendor: string | null;
  notes: string | null;
  created_at: string;
};

export type StaffAssignment = {
  id: string;
  event_id: string;
  staff_member_id: string;
  user_id: string;
  organization_id?: string | null;
  role: string | null;
  start_time: string | null;
  end_time: string | null;
  confirmed: boolean;
  notes: string | null;
  created_at: string;
  staff_member?: StaffMember;
};

export type UserEntitlements = {
  plan: "basic" | "pro";
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | "none";
  isPro: boolean;
};

// Organization types
export type OrganizationType = 'caterer' | 'venue' | 'planner' | 'rental_vendor' | 'florist' | 'entertainment_vendor' | 'other_vendor';
export type OrgMemberRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  organization_type: OrganizationType;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  logo_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgMemberRole;
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type OrgContext = {
  userId: string;
  orgId: string;
  role: OrgMemberRole;
};
