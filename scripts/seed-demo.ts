/**
 * Seed a PFG Partner Demo Sandbox
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEMO_EMAIL = "demo-pfg@cateros.internal";
const DEMO_PASSWORD = "demo-pfg-sandbox-2026!";
const SANDBOX_SLUG = "pfg-sandbox";

async function main() {
  console.log("=== Cateros Demo Sandbox Seeder ===\n");

  // 1. Create or get demo user
  console.log("1. Creating demo user...");
  let demoUserId: string;

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find(u => u.email === DEMO_EMAIL);

  if (existing) {
    demoUserId = existing.id;
    console.log(`   Found existing demo user: ${demoUserId}`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo Caterer" },
    });
    if (error) throw new Error(`Failed to create demo user: ${error.message}`);
    demoUserId = newUser.user.id;
    console.log(`   Created demo user: ${demoUserId}`);
  }

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: demoUserId,
    email: DEMO_EMAIL,
    full_name: "Harvest & Hearth Catering",
    company_name: "Harvest & Hearth Catering Co.",
    business_type: "caterer",
    primary_goal: "manage_events",
    onboarding_completed: true,
    onboarding_role_completed: true,
    has_seen_welcome: true,
    plan_tier: "pro",
    subscription_status: "active",
    enabled_modules: [
      "events", "cain", "recipes", "staff", "proposals", "shopping",
      "production", "schedule", "clients", "calendar", "billing",
    ],
  }, { onConflict: "id" });

  // 2. Create demo organization
  console.log("2. Creating demo organization...");
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", SANDBOX_SLUG)
    .maybeSingle();

  let orgId: string;
  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`   Found existing org: ${orgId}`);
  } else {
    const { data: newOrg, error } = await supabase.from("organizations").insert({
      name: "Harvest & Hearth Catering Co.",
      slug: SANDBOX_SLUG,
      organization_type: "caterer",
      primary_contact_name: "Demo User",
      primary_contact_email: DEMO_EMAIL,
      status: "active",
    }).select("id").single();
    if (error) throw new Error(`Failed to create org: ${error.message}`);
    orgId = newOrg.id;
    console.log(`   Created org: ${orgId}`);
  }

  // Add demo user as owner
  await supabase.from("organization_members").upsert({
    organization_id: orgId,
    user_id: demoUserId,
    role: "owner",
    status: "active",
  }, { onConflict: "organization_id,user_id" });

  // Set current org
  await supabase.from("profiles").update({ current_organization_id: orgId }).eq("id", demoUserId);

  // 3. Create business settings
  console.log("3. Creating business settings...");
  const { data: existingSettings } = await supabase
    .from("business_settings")
    .select("id")
    .eq("user_id", demoUserId)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from("business_settings").insert({
      user_id: demoUserId,
      organization_id: orgId,
      business_name: "Harvest & Hearth Catering Co.",
      phone: "(914) 555-0182",
      email: "events@harvestandhearth.com",
      address: "247 Main Street, Westchester, NY 10601",
      default_admin_fee: 14,
      default_tax_rate: 6.2,
      default_target_margin: 30,
      brand_color: "#c4956a",
    });
  }

  // 4. Seed staff members
  console.log("4. Creating staff members...");
  const staffData = [
    { name: "Marcus Rivera", role: "Executive Chef", hourly_rate: 55, phone: "(914) 555-0201" },
    { name: "Sarah Chen", role: "Sous Chef", hourly_rate: 38, phone: "(914) 555-0202" },
    { name: "Jordan Williams", role: "Event Captain", hourly_rate: 32, phone: "(914) 555-0203" },
    { name: "Emily Nguyen", role: "Lead Server", hourly_rate: 28, phone: "(914) 555-0204" },
    { name: "Carlos Mendez", role: "Server", hourly_rate: 22, phone: "(914) 555-0205" },
    { name: "Aisha Patel", role: "Server", hourly_rate: 22, phone: "(914) 555-0206" },
    { name: "Tyler Brooks", role: "Bartender", hourly_rate: 30, phone: "(914) 555-0207" },
    { name: "Grace Kim", role: "Prep Cook", hourly_rate: 20, phone: "(914) 555-0208" },
  ];

  // Clear old demo staff
  await supabase.from("staff_members").delete().eq("user_id", demoUserId);
  const { data: staff } = await supabase.from("staff_members").insert(
    staffData.map(s => ({ ...s, user_id: demoUserId, organization_id: orgId }))
  ).select("id, name");
  console.log(`   Created ${staff?.length ?? 0} staff members`);

  // 5. Seed recipes
  console.log("5. Creating recipes...");
  await supabase.from("recipes").delete().eq("user_id", demoUserId);

  const recipes = [
    {
      name: "Grilled Lemon Herb Chicken",
      description: "Marinated chicken breast with lemon zest, garlic, thyme, and oregano. Grilled to order.",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Chicken Breast (6oz)", quantity: 1, unit: "portion", cost_per_unit: 2.40, total_cost: 2.40 },
        { id: "i2", name: "Lemon", quantity: 0.5, unit: "each", cost_per_unit: 0.40, total_cost: 0.20 },
        { id: "i3", name: "Fresh Herbs (thyme, oregano)", quantity: 0.25, unit: "bunch", cost_per_unit: 1.20, total_cost: 0.30 },
        { id: "i4", name: "Garlic", quantity: 2, unit: "clove", cost_per_unit: 0.05, total_cost: 0.10 },
        { id: "i5", name: "Olive Oil", quantity: 0.5, unit: "oz", cost_per_unit: 0.15, total_cost: 0.08 },
      ],
      total_cost: 3.08,
      cost_per_serving: 3.08,
    },
    {
      name: "Herb Roasted Chicken",
      description: "Airline chicken breast with fresh herb crust, natural pan jus, roasted root vegetables",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Airline Chicken Breast (8oz)", quantity: 1, unit: "portion", cost_per_unit: 3.20, total_cost: 3.20 },
        { id: "i2", name: "Fresh Herbs (thyme, rosemary, sage)", quantity: 0.25, unit: "bunch", cost_per_unit: 1.20, total_cost: 0.30 },
        { id: "i3", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
        { id: "i4", name: "Root Vegetables (carrots, parsnips)", quantity: 4, unit: "oz", cost_per_unit: 0.10, total_cost: 0.40 },
        { id: "i5", name: "Olive Oil", quantity: 0.5, unit: "oz", cost_per_unit: 0.15, total_cost: 0.08 },
      ],
      total_cost: 4.23,
      cost_per_serving: 4.23,
    },
    {
      name: "Filet Mignon",
      description: "8oz center-cut tenderloin with red wine reduction, truffle potato puree",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Beef Tenderloin (8oz)", quantity: 1, unit: "portion", cost_per_unit: 12.50, total_cost: 12.50 },
        { id: "i2", name: "Red Wine (cooking)", quantity: 2, unit: "oz", cost_per_unit: 0.30, total_cost: 0.60 },
        { id: "i3", name: "Demi-Glace", quantity: 2, unit: "oz", cost_per_unit: 0.45, total_cost: 0.90 },
        { id: "i4", name: "Butter", quantity: 1.5, unit: "oz", cost_per_unit: 0.25, total_cost: 0.38 },
        { id: "i5", name: "Fresh Thyme", quantity: 0.1, unit: "bunch", cost_per_unit: 1.20, total_cost: 0.12 },
      ],
      total_cost: 14.50,
      cost_per_serving: 14.50,
    },
    {
      name: "Tuna Tartare",
      description: "Sushi-grade ahi tuna, sesame soy dressing, avocado mousse, wonton crisp",
      category: "Appetizers",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Sushi-Grade Ahi Tuna (4oz)", quantity: 1, unit: "portion", cost_per_unit: 4.20, total_cost: 4.20 },
        { id: "i2", name: "Avocado", quantity: 0.25, unit: "each", cost_per_unit: 1.60, total_cost: 0.40 },
        { id: "i3", name: "Sesame Oil", quantity: 0.25, unit: "oz", cost_per_unit: 0.30, total_cost: 0.08 },
        { id: "i4", name: "Soy Sauce", quantity: 0.5, unit: "oz", cost_per_unit: 0.10, total_cost: 0.05 },
        { id: "i5", name: "Wonton Wrappers", quantity: 2, unit: "each", cost_per_unit: 0.05, total_cost: 0.10 },
      ],
      total_cost: 4.83,
      cost_per_serving: 4.83,
    },
    {
      name: "Burrata and Heirloom Tomato",
      description: "Fresh burrata, heirloom tomatoes, aged balsamic, basil oil, flaky sea salt",
      category: "Appetizers",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Burrata (4oz)", quantity: 1, unit: "portion", cost_per_unit: 2.80, total_cost: 2.80 },
        { id: "i2", name: "Heirloom Tomatoes", quantity: 4, unit: "oz", cost_per_unit: 0.25, total_cost: 1.00 },
        { id: "i3", name: "Aged Balsamic", quantity: 0.5, unit: "oz", cost_per_unit: 0.60, total_cost: 0.30 },
        { id: "i4", name: "Fresh Basil", quantity: 3, unit: "leaves", cost_per_unit: 0.05, total_cost: 0.15 },
        { id: "i5", name: "Olive Oil (finishing)", quantity: 0.5, unit: "oz", cost_per_unit: 0.20, total_cost: 0.10 },
      ],
      total_cost: 4.35,
      cost_per_serving: 4.35,
    },
    {
      name: "Truffle Potato Puree",
      description: "Yukon gold potatoes, heavy cream, truffle oil, chives",
      category: "Sides",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Yukon Gold Potatoes", quantity: 6, unit: "oz", cost_per_unit: 0.08, total_cost: 0.48 },
        { id: "i2", name: "Heavy Cream", quantity: 2, unit: "oz", cost_per_unit: 0.12, total_cost: 0.24 },
        { id: "i3", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
        { id: "i4", name: "Truffle Oil", quantity: 0.25, unit: "oz", cost_per_unit: 3.00, total_cost: 0.75 },
        { id: "i5", name: "Chives", quantity: 0.1, unit: "bunch", cost_per_unit: 1.00, total_cost: 0.10 },
      ],
      total_cost: 1.82,
      cost_per_serving: 1.82,
    },
    {
      name: "Garlic Mashed Potatoes",
      description: "Creamy Yukon gold potatoes with roasted garlic, butter, cream",
      category: "Sides",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Yukon Gold Potatoes", quantity: 6, unit: "oz", cost_per_unit: 0.08, total_cost: 0.48 },
        { id: "i2", name: "Roasted Garlic", quantity: 3, unit: "clove", cost_per_unit: 0.05, total_cost: 0.15 },
        { id: "i3", name: "Heavy Cream", quantity: 1.5, unit: "oz", cost_per_unit: 0.12, total_cost: 0.18 },
        { id: "i4", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
      ],
      total_cost: 1.06,
      cost_per_serving: 1.06,
    },
    {
      name: "Roasted Root Vegetables",
      description: "Seasonal root vegetables — carrots, parsnips, beets — with herbs and honey glaze",
      category: "Sides",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Carrots", quantity: 2, unit: "oz", cost_per_unit: 0.06, total_cost: 0.12 },
        { id: "i2", name: "Parsnips", quantity: 2, unit: "oz", cost_per_unit: 0.10, total_cost: 0.20 },
        { id: "i3", name: "Beets", quantity: 2, unit: "oz", cost_per_unit: 0.08, total_cost: 0.16 },
        { id: "i4", name: "Honey", quantity: 0.5, unit: "oz", cost_per_unit: 0.20, total_cost: 0.10 },
        { id: "i5", name: "Fresh Thyme", quantity: 0.1, unit: "bunch", cost_per_unit: 1.20, total_cost: 0.12 },
      ],
      total_cost: 0.70,
      cost_per_serving: 0.70,
    },
    {
      name: "Stuffed Acorn Squash",
      description: "Roasted acorn squash stuffed with wild rice, cranberries, pecans, and sage brown butter",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Acorn Squash", quantity: 0.5, unit: "each", cost_per_unit: 2.00, total_cost: 1.00 },
        { id: "i2", name: "Wild Rice Blend", quantity: 3, unit: "oz", cost_per_unit: 0.30, total_cost: 0.90 },
        { id: "i3", name: "Dried Cranberries", quantity: 1, unit: "oz", cost_per_unit: 0.40, total_cost: 0.40 },
        { id: "i4", name: "Pecans", quantity: 1, unit: "oz", cost_per_unit: 0.60, total_cost: 0.60 },
        { id: "i5", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
        { id: "i6", name: "Fresh Sage", quantity: 3, unit: "leaves", cost_per_unit: 0.05, total_cost: 0.15 },
      ],
      total_cost: 3.30,
      cost_per_serving: 3.30,
    },
    {
      name: "Mixed Greens Salad",
      description: "Spring mix, shaved vegetables, toasted seeds, citrus vinaigrette",
      category: "Appetizers",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Spring Mix", quantity: 3, unit: "oz", cost_per_unit: 0.15, total_cost: 0.45 },
        { id: "i2", name: "Shaved Carrots & Radish", quantity: 1, unit: "oz", cost_per_unit: 0.10, total_cost: 0.10 },
        { id: "i3", name: "Toasted Sunflower Seeds", quantity: 0.5, unit: "oz", cost_per_unit: 0.20, total_cost: 0.10 },
        { id: "i4", name: "Citrus Vinaigrette", quantity: 1.5, unit: "oz", cost_per_unit: 0.15, total_cost: 0.23 },
      ],
      total_cost: 0.88,
      cost_per_serving: 0.88,
    },
    {
      name: "Carved Turkey Breast",
      description: "Slow-roasted turkey breast, herb gravy, cranberry compote",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Turkey Breast (6oz)", quantity: 1, unit: "portion", cost_per_unit: 3.00, total_cost: 3.00 },
        { id: "i2", name: "Fresh Herbs", quantity: 0.15, unit: "bunch", cost_per_unit: 1.20, total_cost: 0.18 },
        { id: "i3", name: "Turkey Stock", quantity: 3, unit: "oz", cost_per_unit: 0.08, total_cost: 0.24 },
        { id: "i4", name: "Cranberries", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
        { id: "i5", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
      ],
      total_cost: 3.92,
      cost_per_serving: 3.92,
    },
    {
      name: "Baked Ziti",
      description: "Ziti pasta, house marinara, ricotta, mozzarella, fresh basil",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Ziti Pasta", quantity: 4, unit: "oz", cost_per_unit: 0.06, total_cost: 0.24 },
        { id: "i2", name: "House Marinara", quantity: 4, unit: "oz", cost_per_unit: 0.15, total_cost: 0.60 },
        { id: "i3", name: "Ricotta", quantity: 2, unit: "oz", cost_per_unit: 0.12, total_cost: 0.24 },
        { id: "i4", name: "Mozzarella", quantity: 2, unit: "oz", cost_per_unit: 0.20, total_cost: 0.40 },
        { id: "i5", name: "Fresh Basil", quantity: 2, unit: "leaves", cost_per_unit: 0.05, total_cost: 0.10 },
      ],
      total_cost: 1.58,
      cost_per_serving: 1.58,
    },
    {
      name: "Roasted Vegetable Pasta",
      description: "Penne with roasted seasonal vegetables, garlic, olive oil, parmesan",
      category: "Mains",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Penne Pasta", quantity: 4, unit: "oz", cost_per_unit: 0.06, total_cost: 0.24 },
        { id: "i2", name: "Zucchini", quantity: 2, unit: "oz", cost_per_unit: 0.10, total_cost: 0.20 },
        { id: "i3", name: "Bell Peppers", quantity: 2, unit: "oz", cost_per_unit: 0.12, total_cost: 0.24 },
        { id: "i4", name: "Cherry Tomatoes", quantity: 2, unit: "oz", cost_per_unit: 0.15, total_cost: 0.30 },
        { id: "i5", name: "Parmesan", quantity: 0.5, unit: "oz", cost_per_unit: 0.80, total_cost: 0.40 },
        { id: "i6", name: "Olive Oil", quantity: 1, unit: "oz", cost_per_unit: 0.15, total_cost: 0.15 },
      ],
      total_cost: 1.53,
      cost_per_serving: 1.53,
    },
    {
      name: "Cookies and Brownies Platter",
      description: "Assorted fresh-baked chocolate chip cookies, double fudge brownies, lemon bars",
      category: "Desserts",
      servings: 1,
      ingredients: [
        { id: "i1", name: "Cookie Dough (portion)", quantity: 2, unit: "oz", cost_per_unit: 0.15, total_cost: 0.30 },
        { id: "i2", name: "Brownie Batter (portion)", quantity: 2, unit: "oz", cost_per_unit: 0.18, total_cost: 0.36 },
        { id: "i3", name: "Chocolate Chips", quantity: 0.5, unit: "oz", cost_per_unit: 0.25, total_cost: 0.13 },
        { id: "i4", name: "Butter", quantity: 1, unit: "oz", cost_per_unit: 0.25, total_cost: 0.25 },
      ],
      total_cost: 1.04,
      cost_per_serving: 1.04,
    },
  ];

  const { data: createdRecipes } = await supabase.from("recipes").insert(
    recipes.map(r => ({
      ...r,
      user_id: demoUserId,
      organization_id: orgId,
      source: "manual" as const,
      status: "approved" as const,
    }))
  ).select("id, name");
  console.log(`   Created ${createdRecipes?.length ?? 0} recipes`);

  // 6. Seed events
  console.log("6. Creating events...");
  // Delete timeline items first (FK dependency), then events
  const { data: oldEvents } = await supabase.from("events").select("id").eq("user_id", demoUserId);
  if (oldEvents && oldEvents.length > 0) {
    const oldIds = oldEvents.map(e => e.id);
    await supabase.from("event_timeline_items").delete().in("event_id", oldIds);
  }
  await supabase.from("events").delete().eq("user_id", demoUserId);

  const today = new Date();
  const futureDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // ── EVENT 1: Corporate Lunch Drop-Off ──
  // Menu sell: $23/person | Food cost: ~$9.50/person (41% food cost)
  // Total sell: $920 | Total food cost: $380
  const event1 = {
    name: "Worcester Tech Office Lunch",
    client_name: "Worcester Tech Solutions",
    client_email: "office@worcestertechsolutions.com",
    client_phone: "(508) 555-0140",
    event_date: futureDate(5),
    start_time: "11:00",
    end_time: "13:00",
    guest_count: 40,
    venue: "Worcester Tech Solutions, 88 Front St, Worcester, MA",
    status: "confirmed",
    notes: "Simple corporate drop-off. Emphasis on efficiency and margin. Contact: Rachel at front desk. Elevator access required — call 15 min before arrival. Disposable serviceware included. 3 vegetarian, 1 gluten-free.",
    pricing_data: {
      guestCount: 40,
      menuItems: [
        { id: "mi-1", name: "Grilled Lemon Herb Chicken", costPerPerson: 4, quantity: 40, category: "Mains", pricingType: "per_guest" },
        { id: "mi-2", name: "Roasted Vegetable Pasta", costPerPerson: 3, quantity: 40, category: "Mains", pricingType: "per_guest" },
        { id: "mi-3", name: "Mixed Greens Salad", costPerPerson: 1.50, quantity: 40, category: "Appetizers", pricingType: "per_guest" },
        { id: "mi-4", name: "Cookies and Brownies", costPerPerson: 1, quantity: 40, category: "Desserts", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "Delivery Driver", hourlyRate: 22, hours: 2, headcount: 1 },
      ],
      rentals: [],
      barPackage: null,
      adminPercent: 14,
      taxPercent: 6.2,
      targetMarginPercent: 30,
      foodCostTotal: 380,
      staffingTotal: 44,
      rentalsTotal: 0,
      barTotal: 0,
      subtotal: 424,
      adminFee: 59.36,
      taxAmount: 29.96,
      totalCost: 513.32,
      suggestedPrice: 733.31,
      projectedMargin: 30,
    },
    timeline: [
      { phase: "prep", task: "Prep chicken marinade and grill", sort_order: 0, assigned_to: "Kitchen" },
      { phase: "prep", task: "Cook pasta and roast vegetables", sort_order: 1, assigned_to: "Kitchen" },
      { phase: "prep", task: "Assemble salads and dessert platters", sort_order: 2, assigned_to: "Kitchen" },
      { phase: "day_of", task: "Load van and depart by 10:15 AM", sort_order: 3, assigned_to: "Delivery Driver" },
      { phase: "day_of", task: "Arrive at Worcester Tech, set up conference room", sort_order: 4, assigned_to: "Delivery Driver" },
      { phase: "day_of", task: "Service window 11:00 AM – 1:00 PM", sort_order: 5 },
      { phase: "breakdown", task: "Pick up serviceware and breakdown", sort_order: 6, assigned_to: "Delivery Driver" },
    ],
  };

  // ── EVENT 2: Wedding Plated Dinner ──
  // Menu sell: ~$61/person food | Food cost: ~$24.50/person (40% food cost)
  // Total with bar, staffing, rentals → ~$85/person sell
  const event2 = {
    name: "Sarah & Michael Wedding Reception",
    client_name: "Sarah Mitchell & Michael Torres",
    client_email: "sarah.m.torres@gmail.com",
    client_phone: "(617) 555-0288",
    event_date: futureDate(38),
    start_time: "17:00",
    end_time: "23:00",
    guest_count: 150,
    venue: "The Barn at Weston, 44 Orchard Lane, Weston, MA",
    status: "confirmed",
    notes: "Formal plated service. Vegetarian option: Stuffed Acorn Squash. Coffee service after dessert. Late-night grilled cheese station as optional add-on (quoted separately). Bride's mother has nut allergy. Florist: Bloom & Vine. Band: The Silverlines (load-in at 4pm). Cake provided by client — we handle service only.",
    pricing_data: {
      guestCount: 150,
      menuItems: [
        { id: "mi-1", name: "Burrata and Heirloom Tomato", costPerPerson: 3, quantity: 150, category: "Appetizers", pricingType: "per_guest" },
        { id: "mi-2", name: "Herb Roasted Chicken (plated)", costPerPerson: 9, quantity: 150, category: "Mains", pricingType: "per_guest" },
        { id: "mi-3", name: "Stuffed Acorn Squash (vegetarian)", costPerPerson: 8, quantity: 150, category: "Mains", pricingType: "per_guest" },
        { id: "mi-4", name: "Garlic Mashed Potatoes", costPerPerson: 2, quantity: 150, category: "Sides", pricingType: "per_guest" },
        { id: "mi-5", name: "Roasted Root Vegetables", costPerPerson: 2.50, quantity: 150, category: "Sides", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "Event Manager", hourlyRate: 45, hours: 8, headcount: 1 },
        { id: "s-2", role: "Server", hourlyRate: 22, hours: 7, headcount: 10 },
        { id: "s-3", role: "Kitchen Staff", hourlyRate: 20, hours: 8, headcount: 3 },
        { id: "s-4", role: "Bartender", hourlyRate: 30, hours: 6, headcount: 2 },
      ],
      rentals: [
        { id: "r-1", item: "60\" Round Tables", unitCost: 12, quantity: 16 },
        { id: "r-2", item: "Chiavari Chairs", unitCost: 4.50, quantity: 150 },
        { id: "r-3", item: "White Linen Sets", unitCost: 18, quantity: 16 },
      ],
      barPackage: { type: "full_bar", costPerPerson: 28, label: "Full Open Bar (5 hrs)" },
      adminPercent: 14,
      taxPercent: 6.2,
      targetMarginPercent: 30,
      foodCostTotal: 3675,
      staffingTotal: 2660,
      rentalsTotal: 1167,
      barTotal: 4200,
      subtotal: 11702,
      adminFee: 1638.28,
      taxAmount: 827.09,
      totalCost: 14167.37,
      suggestedPrice: 20239.10,
      projectedMargin: 30,
    },
    timeline: [
      { phase: "prep", task: "Prep all sauces, marinades, and mise en place (day before)", sort_order: 0, assigned_to: "Kitchen Staff" },
      { phase: "prep", task: "Butcher and portion chicken, prep squash filling", sort_order: 1, assigned_to: "Kitchen Staff" },
      { phase: "prep", task: "Load truck — china, linen, equipment", sort_order: 2, assigned_to: "Event Manager" },
      { phase: "day_of", task: "Arrive venue 2:00 PM — begin setup", sort_order: 3, assigned_to: "Full Team" },
      { phase: "day_of", task: "Kitchen hot by 3:30 PM", sort_order: 4, assigned_to: "Kitchen Staff" },
      { phase: "day_of", task: "Cocktail hour 5:00 – 6:00 PM (passed apps)", sort_order: 5, assigned_to: "Servers" },
      { phase: "day_of", task: "Plated dinner service 6:30 PM", sort_order: 6, assigned_to: "Full Team" },
      { phase: "day_of", task: "Cake cutting and coffee service 8:30 PM", sort_order: 7, assigned_to: "Servers" },
      { phase: "day_of", task: "Bar last call 10:30 PM", sort_order: 8, assigned_to: "Bartenders" },
      { phase: "breakdown", task: "Kitchen breakdown begins 10:00 PM", sort_order: 9, assigned_to: "Kitchen Staff" },
      { phase: "breakdown", task: "Full venue clear by 11:30 PM", sort_order: 10, assigned_to: "Full Team" },
    ],
  };

  // ── EVENT 3: University Dining Program ──
  // Average sell: $14/meal | Food cost target: 38% (~$5.32/meal)
  // 400 daily × $14 = $5,600/day
  const event3 = {
    name: "Northeast University Dining Contract",
    client_name: "Northeast University — Dining Services",
    client_email: "dining@northeasternuniv.edu",
    client_phone: "(508) 555-0390",
    event_date: futureDate(10),
    start_time: "10:00",
    end_time: "14:00",
    guest_count: 400,
    venue: "Northeast University, Main Dining Hall, Worcester, MA",
    status: "confirmed",
    notes: "High-volume recurring dining contract — 5 days/week during academic year. Daily menu rotation: Chicken Stir Fry, Pasta Bar, Taco Station, Baked Fish with Rice, Chef Weekly Special. Focus on cost control and consistency. Food cost target: 38%. Always include vegetarian and halal options. Contact: Dining Director Mark Sullivan, ext 2240.",
    pricing_data: {
      guestCount: 400,
      menuItems: [
        { id: "mi-1", name: "Daily Entree Rotation (avg)", costPerPerson: 5.32, quantity: 400, category: "Mains", pricingType: "per_guest" },
        { id: "mi-2", name: "Salad Bar & Sides", costPerPerson: 1.80, quantity: 400, category: "Sides", pricingType: "per_guest" },
        { id: "mi-3", name: "Beverages (fountain, coffee, juice)", costPerPerson: 0.90, quantity: 400, category: "Drinks", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "General Manager", hourlyRate: 40, hours: 6, headcount: 1 },
        { id: "s-2", role: "Line Cook", hourlyRate: 20, hours: 6, headcount: 4 },
        { id: "s-3", role: "Service Staff", hourlyRate: 16, hours: 5, headcount: 6 },
      ],
      rentals: [],
      barPackage: null,
      adminPercent: 10,
      taxPercent: 0,
      targetMarginPercent: 22,
      foodCostTotal: 3208,
      staffingTotal: 1200,
      rentalsTotal: 0,
      barTotal: 0,
      subtotal: 4408,
      adminFee: 440.80,
      taxAmount: 0,
      totalCost: 4848.80,
      suggestedPrice: 6216.67,
      projectedMargin: 22,
    },
    timeline: [
      { phase: "prep", task: "Weekly menu planning and ordering (Friday prior)", sort_order: 0, assigned_to: "General Manager" },
      { phase: "prep", task: "Receive deliveries, inspect, and store (Mon 7 AM)", sort_order: 1, assigned_to: "General Manager" },
      { phase: "day_of", task: "Kitchen open and prep begins 7:00 AM", sort_order: 2, assigned_to: "Line Cooks" },
      { phase: "day_of", task: "Salad bar and cold stations set by 9:30 AM", sort_order: 3, assigned_to: "Service Staff" },
      { phase: "day_of", task: "Hot line ready by 10:00 AM — service begins", sort_order: 4, assigned_to: "Line Cooks" },
      { phase: "day_of", task: "Lunch service 10:00 AM – 2:00 PM", sort_order: 5, assigned_to: "Full Team" },
      { phase: "breakdown", task: "Line breakdown and deep clean by 3:00 PM", sort_order: 6, assigned_to: "Full Team" },
      { phase: "breakdown", task: "Inventory count and next-day prep list", sort_order: 7, assigned_to: "General Manager" },
    ],
  };

  // ── EVENT 4: Private School Dining ──
  // Sell: $11/meal | Food cost target: 35–40% (~$4.15/meal)
  // 120 students × 5 days × $11 = $6,600/week
  const event4 = {
    name: "St. Marks School Weekly Dining",
    client_name: "St. Marks Preparatory Academy",
    client_email: "admin@stmarksprep.edu",
    client_phone: "(860) 555-0175",
    event_date: futureDate(7),
    start_time: "10:30",
    end_time: "13:00",
    guest_count: 120,
    venue: "St. Marks Preparatory Academy, Hartford, CT",
    status: "confirmed",
    notes: "Long-term school dining contract — 5 days/week during school year. Predictable revenue and purchasing. Menu: Grilled Chicken, Rice Pilaf, Seasonal Vegetables, Salad Bar. Must accommodate nut-free facility. Food cost target: 35–40%. Contact: Head of School, Mrs. Calloway. Delivery to kitchen entrance by 10:30 AM daily.",
    pricing_data: {
      guestCount: 120,
      menuItems: [
        { id: "mi-1", name: "Student Meal (entree, grain, vegetable)", costPerPerson: 3.50, quantity: 120, category: "Mains", pricingType: "per_guest" },
        { id: "mi-2", name: "Salad Bar", costPerPerson: 0.65, quantity: 120, category: "Sides", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "Prep Cook", hourlyRate: 18, hours: 4, headcount: 2 },
        { id: "s-2", role: "Delivery Driver", hourlyRate: 22, hours: 2, headcount: 1 },
      ],
      rentals: [],
      barPackage: null,
      adminPercent: 8,
      taxPercent: 0,
      targetMarginPercent: 20,
      foodCostTotal: 498,
      staffingTotal: 188,
      rentalsTotal: 0,
      barTotal: 0,
      subtotal: 686,
      adminFee: 54.88,
      taxAmount: 0,
      totalCost: 740.88,
      suggestedPrice: 926.10,
      projectedMargin: 20,
    },
    timeline: [
      { phase: "prep", task: "Weekly purchasing and menu confirmation (Friday)", sort_order: 0, assigned_to: "Prep Cook" },
      { phase: "prep", task: "Prep proteins and grains (morning of)", sort_order: 1, assigned_to: "Prep Cooks" },
      { phase: "day_of", task: "Load and depart kitchen by 9:45 AM", sort_order: 2, assigned_to: "Delivery Driver" },
      { phase: "day_of", task: "Arrive St. Marks — setup in dining room by 10:30 AM", sort_order: 3, assigned_to: "Delivery Driver" },
      { phase: "day_of", task: "Lunch service 11:00 AM – 12:30 PM", sort_order: 4 },
      { phase: "breakdown", task: "Pack up and return to commissary by 1:30 PM", sort_order: 5, assigned_to: "Delivery Driver" },
    ],
  };

  // ── EVENT 5: Corporate Holiday Buffet ──
  // Menu sell: ~$29/person food | Food cost: ~$11.75/person (41% food cost)
  // With staffing → ~$48/person total sell
  const event5 = {
    name: "Hartford Corporate Holiday Buffet",
    client_name: "Meridian Financial Group",
    client_email: "events@meridianfg.com",
    client_phone: "(860) 555-0422",
    event_date: futureDate(52),
    start_time: "18:00",
    end_time: "22:00",
    guest_count: 80,
    venue: "Meridian Financial Group, 200 Pearl St, Hartford, CT",
    status: "confirmed",
    notes: "Annual company holiday party. Standard buffet execution. Balanced labor and food cost. CEO will give brief toast at 7 PM. Gift bags at coat check — coordinate timing with office manager (Karen, ext 300). Parking validated in garage B.",
    pricing_data: {
      guestCount: 80,
      menuItems: [
        { id: "mi-1", name: "Carved Turkey Breast", costPerPerson: 6, quantity: 80, category: "Mains", pricingType: "per_guest" },
        { id: "mi-2", name: "Baked Ziti", costPerPerson: 3, quantity: 80, category: "Mains", pricingType: "per_guest" },
        { id: "mi-3", name: "Green Beans Almondine", costPerPerson: 2, quantity: 80, category: "Sides", pricingType: "per_guest" },
        { id: "mi-4", name: "Dinner Rolls & Butter", costPerPerson: 0.75, quantity: 80, category: "Sides", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "Server", hourlyRate: 22, hours: 5, headcount: 6 },
        { id: "s-2", role: "Kitchen Staff", hourlyRate: 20, hours: 5, headcount: 2 },
      ],
      rentals: [
        { id: "r-1", item: "Chafing Dishes (full size)", unitCost: 15, quantity: 6 },
        { id: "r-2", item: "Buffet Skirting & Linen", unitCost: 25, quantity: 3 },
      ],
      barPackage: { type: "beer_wine", costPerPerson: 18, label: "Beer & Wine Package (4 hrs)" },
      adminPercent: 14,
      taxPercent: 6.2,
      targetMarginPercent: 30,
      foodCostTotal: 940,
      staffingTotal: 860,
      rentalsTotal: 165,
      barTotal: 1440,
      subtotal: 3405,
      adminFee: 476.70,
      taxAmount: 240.71,
      totalCost: 4122.41,
      suggestedPrice: 5889.16,
      projectedMargin: 30,
    },
    timeline: [
      { phase: "prep", task: "Prep turkey — brine and season (day before)", sort_order: 0, assigned_to: "Kitchen Staff" },
      { phase: "prep", task: "Prep ziti, green beans, rolls (morning of)", sort_order: 1, assigned_to: "Kitchen Staff" },
      { phase: "prep", task: "Load truck — chafing dishes, linen, serviceware", sort_order: 2, assigned_to: "Kitchen Staff" },
      { phase: "day_of", task: "Arrive venue 4:00 PM — buffet setup", sort_order: 3, assigned_to: "Full Team" },
      { phase: "day_of", task: "Bar setup and ice delivery 4:30 PM", sort_order: 4, assigned_to: "Servers" },
      { phase: "day_of", task: "Buffet opens 6:00 PM", sort_order: 5, assigned_to: "Servers" },
      { phase: "day_of", task: "CEO toast at 7:00 PM — pause service briefly", sort_order: 6 },
      { phase: "day_of", task: "Dessert station opens 8:00 PM", sort_order: 7, assigned_to: "Servers" },
      { phase: "breakdown", task: "Buffet close 9:30 PM — begin breakdown", sort_order: 8, assigned_to: "Full Team" },
      { phase: "breakdown", task: "Venue clear by 10:30 PM", sort_order: 9, assigned_to: "Full Team" },
    ],
  };

  // ── EVENT 6: Upscale Private Dinner ──
  // Menu sell: ~$68/person food | Food cost: ~$31/person (46% food cost)
  // Premium pricing → $145/person total sell
  const event6 = {
    name: "Private Estate Dinner — West Hartford",
    client_name: "The Brennan Family",
    client_email: "j.brennan@brennanholdings.com",
    client_phone: "(860) 555-0715",
    event_date: futureDate(16),
    start_time: "19:00",
    end_time: "23:00",
    guest_count: 20,
    venue: "Brennan Estate, 12 Ridgewood Dr, West Hartford, CT",
    status: "confirmed",
    notes: "High-end private dining experience — 30th wedding anniversary. Premium pricing and presentation. 4-course plated dinner with chef tableside presentation between courses. Wine pairing coordinated with client's private cellar. Mrs. Brennan is pescatarian — substitute salmon for filet on her plate. Dietary: 2 guests gluten-free. White-glove service throughout.",
    pricing_data: {
      guestCount: 20,
      menuItems: [
        { id: "mi-1", name: "Tuna Tartare", costPerPerson: 6, quantity: 20, category: "Appetizers", pricingType: "per_guest" },
        { id: "mi-2", name: "Filet Mignon", costPerPerson: 18, quantity: 20, category: "Mains", pricingType: "per_guest" },
        { id: "mi-3", name: "Truffle Potato Puree", costPerPerson: 4, quantity: 20, category: "Sides", pricingType: "per_guest" },
        { id: "mi-4", name: "Asparagus with Hollandaise", costPerPerson: 3, quantity: 20, category: "Sides", pricingType: "per_guest" },
      ],
      staffing: [
        { id: "s-1", role: "Executive Chef", hourlyRate: 75, hours: 6, headcount: 1 },
        { id: "s-2", role: "Server (White Glove)", hourlyRate: 35, hours: 5, headcount: 2 },
      ],
      rentals: [],
      barPackage: null,
      adminPercent: 14,
      taxPercent: 6.2,
      targetMarginPercent: 35,
      foodCostTotal: 620,
      staffingTotal: 800,
      rentalsTotal: 0,
      barTotal: 0,
      subtotal: 1420,
      adminFee: 198.80,
      taxAmount: 100.33,
      totalCost: 1719.13,
      suggestedPrice: 2644.82,
      projectedMargin: 35,
    },
    timeline: [
      { phase: "prep", task: "Source sushi-grade tuna and filet mignon (day before)", sort_order: 0, assigned_to: "Executive Chef" },
      { phase: "prep", task: "Prep tartare components, potato puree base, hollandaise", sort_order: 1, assigned_to: "Executive Chef" },
      { phase: "prep", task: "Pack plating supplies, finishing oils, garnishes", sort_order: 2, assigned_to: "Executive Chef" },
      { phase: "day_of", task: "Arrive estate 4:00 PM — inspect kitchen, set stations", sort_order: 3, assigned_to: "Full Team" },
      { phase: "day_of", task: "Table set and glassware polished by 6:00 PM", sort_order: 4, assigned_to: "Servers" },
      { phase: "day_of", task: "Guests arrive 7:00 PM — amuse-bouche passed", sort_order: 5, assigned_to: "Servers" },
      { phase: "day_of", task: "Course 1: Tuna Tartare — 7:30 PM", sort_order: 6, assigned_to: "Executive Chef" },
      { phase: "day_of", task: "Course 2: Filet Mignon, truffle potato, asparagus — 8:15 PM", sort_order: 7, assigned_to: "Executive Chef" },
      { phase: "day_of", task: "Chef tableside presentation between courses", sort_order: 8, assigned_to: "Executive Chef" },
      { phase: "day_of", task: "Dessert and coffee service — 9:30 PM", sort_order: 9, assigned_to: "Servers" },
      { phase: "breakdown", task: "Kitchen breakdown begins 10:00 PM", sort_order: 10, assigned_to: "Executive Chef" },
      { phase: "breakdown", task: "Full clear and depart by 11:00 PM", sort_order: 11, assigned_to: "Full Team" },
    ],
  };

  const allEvents = [event1, event2, event3, event4, event5, event6];

  const { data: createdEvents } = await supabase.from("events").insert(
    allEvents.map(({ timeline: _timeline, ...e }) => ({
      ...e,
      user_id: demoUserId,
      organization_id: orgId,
    }))
  ).select("id, name");
  console.log(`   Created ${createdEvents?.length ?? 0} events`);

  // 6b. Seed timeline items for each event
  console.log("   Creating timeline items...");
  if (createdEvents) {
    for (let i = 0; i < createdEvents.length; i++) {
      const eventTimeline = allEvents[i].timeline;
      if (eventTimeline && eventTimeline.length > 0) {
        await supabase.from("event_timeline_items").insert(
          eventTimeline.map(t => ({
            event_id: createdEvents[i].id,
            phase: t.phase,
            task: t.task,
            sort_order: t.sort_order,
            assigned_to: t.assigned_to || null,
            completed: false,
          }))
        );
      }
    }
    console.log(`   Created timeline items for ${createdEvents.length} events`);
  }

  // 7. Create sandbox and access token
  console.log("7. Creating sandbox and access token...");

  // Remove old sandbox if exists
  await supabase.from("demo_sandboxes").delete().eq("slug", SANDBOX_SLUG);

  const { data: sandbox, error: sbErr } = await supabase.from("demo_sandboxes").insert({
    name: "PFG Partner Sandbox",
    slug: SANDBOX_SLUG,
    demo_user_id: demoUserId,
    demo_org_id: orgId,
    partner_name: "PFG",
    business_type: "caterer",
    status: "active",
    description: "Pre-loaded demo environment for PFG partnership evaluation.",
  }).select("id").single();

  if (sbErr) throw new Error(`Failed to create sandbox: ${sbErr.message}`);

  const { data: accessToken } = await supabase.from("demo_access_tokens").insert({
    sandbox_id: sandbox.id,
    label: "PFG Primary Access Link",
    is_active: true,
  }).select("token").single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const demoLink = `${appUrl}/demo/${accessToken!.token}`;

  console.log("\n=== SANDBOX READY ===");
  console.log(`Sandbox ID: ${sandbox.id}`);
  console.log(`Demo User:  ${DEMO_EMAIL}`);
  console.log(`Org:        ${orgId}`);
  console.log(`\nAccess Link:\n${demoLink}`);
  console.log("\nShare this link with PFG. No signup required.");
}

main().catch(err => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
