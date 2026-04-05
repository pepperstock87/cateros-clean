import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/organizations";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await getCurrentOrg();
  const orgId = org?.orgId || null;

  // ── Recipes ──
  const recipes = [
    {
      name: "Roasted Beet & Goat Cheese Salad",
      description: "Roast beets at 400°F for 45 min until tender. Cool, peel, and dice.\nToss mixed greens with light vinaigrette.\nArrange beets over greens, crumble goat cheese on top.\nGarnish with candied walnuts and fresh thyme.\nDrizzle with aged balsamic reduction.",
      servings: 25,
      category: "Salads",
      ingredients: [
        { id: crypto.randomUUID(), name: "Red beets", quantity: 5, unit: "lb", cost_per_unit: 2.50, total_cost: 12.50 },
        { id: crypto.randomUUID(), name: "Mixed greens", quantity: 2, unit: "lb", cost_per_unit: 6.00, total_cost: 12.00 },
        { id: crypto.randomUUID(), name: "Goat cheese", quantity: 1.5, unit: "lb", cost_per_unit: 12.00, total_cost: 18.00 },
        { id: crypto.randomUUID(), name: "Walnuts", quantity: 0.5, unit: "lb", cost_per_unit: 14.00, total_cost: 7.00 },
        { id: crypto.randomUUID(), name: "Balsamic reduction", quantity: 8, unit: "oz", cost_per_unit: 1.50, total_cost: 12.00 },
      ],
    },
    {
      name: "Braised Short Ribs",
      description: "Season short ribs generously with salt, pepper, and smoked paprika.\nSear in cast iron until deeply browned on all sides.\nSauté mirepoix (onion, carrot, celery) until softened.\nDeglaze with red wine, add beef stock and tomato paste.\nBraise covered at 325°F for 3 hours until fork-tender.\nStrain and reduce braising liquid into rich sauce.",
      servings: 20,
      category: "Entrees",
      ingredients: [
        { id: crypto.randomUUID(), name: "Bone-in short ribs", quantity: 15, unit: "lb", cost_per_unit: 8.50, total_cost: 127.50 },
        { id: crypto.randomUUID(), name: "Red wine", quantity: 2, unit: "qt", cost_per_unit: 6.00, total_cost: 12.00 },
        { id: crypto.randomUUID(), name: "Beef stock", quantity: 1, unit: "gal", cost_per_unit: 8.00, total_cost: 8.00 },
        { id: crypto.randomUUID(), name: "Onions", quantity: 3, unit: "lb", cost_per_unit: 1.50, total_cost: 4.50 },
        { id: crypto.randomUUID(), name: "Carrots", quantity: 2, unit: "lb", cost_per_unit: 1.80, total_cost: 3.60 },
        { id: crypto.randomUUID(), name: "Celery", quantity: 1, unit: "bunch", cost_per_unit: 2.00, total_cost: 2.00 },
        { id: crypto.randomUUID(), name: "Tomato paste", quantity: 6, unit: "oz", cost_per_unit: 0.50, total_cost: 3.00 },
      ],
    },
    {
      name: "Wild Mushroom Risotto",
      description: "Sauté mixed wild mushrooms (shiitake, oyster, cremini) in butter until golden.\nToast arborio rice in olive oil until translucent edges.\nAdd warm chicken stock one ladle at a time, stirring continuously.\nFold in sautéed mushrooms, parmesan, and fresh thyme.\nFinish with truffle oil and season to taste.\nServe immediately — risotto waits for no one.",
      servings: 30,
      category: "Sides",
      ingredients: [
        { id: crypto.randomUUID(), name: "Arborio rice", quantity: 4, unit: "lb", cost_per_unit: 4.00, total_cost: 16.00 },
        { id: crypto.randomUUID(), name: "Mixed wild mushrooms", quantity: 3, unit: "lb", cost_per_unit: 12.00, total_cost: 36.00 },
        { id: crypto.randomUUID(), name: "Chicken stock", quantity: 1.5, unit: "gal", cost_per_unit: 7.00, total_cost: 10.50 },
        { id: crypto.randomUUID(), name: "Parmesan cheese", quantity: 1, unit: "lb", cost_per_unit: 16.00, total_cost: 16.00 },
        { id: crypto.randomUUID(), name: "Butter", quantity: 0.5, unit: "lb", cost_per_unit: 6.00, total_cost: 3.00 },
        { id: crypto.randomUUID(), name: "Truffle oil", quantity: 2, unit: "oz", cost_per_unit: 8.00, total_cost: 16.00 },
      ],
    },
    {
      name: "Lemon Panna Cotta with Berry Compote",
      description: "Bloom gelatin in cold water for 5 minutes.\nHeat cream and sugar until just simmering, do not boil.\nStir in bloomed gelatin until dissolved.\nAdd lemon zest, vanilla extract, and a pinch of salt.\nPour into individual molds and refrigerate 4+ hours.\nPrepare berry compote: simmer mixed berries with sugar and lemon juice.\nUnmold and serve with warm compote and fresh mint.",
      servings: 40,
      category: "Desserts",
      ingredients: [
        { id: crypto.randomUUID(), name: "Heavy cream", quantity: 1, unit: "gal", cost_per_unit: 12.00, total_cost: 12.00 },
        { id: crypto.randomUUID(), name: "Sugar", quantity: 2, unit: "lb", cost_per_unit: 1.50, total_cost: 3.00 },
        { id: crypto.randomUUID(), name: "Gelatin sheets", quantity: 2, unit: "pkg", cost_per_unit: 8.00, total_cost: 16.00 },
        { id: crypto.randomUUID(), name: "Lemons", quantity: 6, unit: "each", cost_per_unit: 0.75, total_cost: 4.50 },
        { id: crypto.randomUUID(), name: "Mixed berries", quantity: 3, unit: "lb", cost_per_unit: 6.00, total_cost: 18.00 },
        { id: crypto.randomUUID(), name: "Vanilla extract", quantity: 2, unit: "oz", cost_per_unit: 4.00, total_cost: 8.00 },
      ],
    },
    {
      name: "Bruschetta Trio",
      description: "Classic Tomato: Dice Roma tomatoes, toss with garlic, basil, EVOO, and balsamic.\nWhipped Ricotta & Honey: Whip ricotta until smooth, drizzle with wildflower honey and cracked pepper.\nMushroom & Gruyère: Sauté cremini mushrooms with thyme, top with shredded gruyère and broil.\nGrill thick-cut sourdough slices, rub with garlic clove.\nAssemble each variety and arrange on platters.",
      servings: 50,
      category: "Appetizers",
      ingredients: [
        { id: crypto.randomUUID(), name: "Sourdough bread", quantity: 4, unit: "each", cost_per_unit: 5.00, total_cost: 20.00 },
        { id: crypto.randomUUID(), name: "Roma tomatoes", quantity: 5, unit: "lb", cost_per_unit: 2.50, total_cost: 12.50 },
        { id: crypto.randomUUID(), name: "Ricotta cheese", quantity: 2, unit: "lb", cost_per_unit: 6.00, total_cost: 12.00 },
        { id: crypto.randomUUID(), name: "Cremini mushrooms", quantity: 2, unit: "lb", cost_per_unit: 5.00, total_cost: 10.00 },
        { id: crypto.randomUUID(), name: "Gruyère cheese", quantity: 1, unit: "lb", cost_per_unit: 18.00, total_cost: 18.00 },
        { id: crypto.randomUUID(), name: "Fresh basil", quantity: 2, unit: "bunch", cost_per_unit: 2.50, total_cost: 5.00 },
        { id: crypto.randomUUID(), name: "Honey", quantity: 8, unit: "oz", cost_per_unit: 1.50, total_cost: 12.00 },
      ],
    },
  ];

  const recipeResults = [];
  for (const r of recipes) {
    const total_cost = r.ingredients.reduce((s, i) => s + i.total_cost, 0);
    const cost_per_serving = r.servings > 0 ? total_cost / r.servings : 0;
    const { error } = await supabase.from("recipes").insert({
      user_id: user.id,
      organization_id: orgId,
      name: r.name,
      description: r.description,
      servings: r.servings,
      category: r.category,
      ingredients: r.ingredients,
      total_cost,
      cost_per_serving,
    });
    recipeResults.push({ name: r.name, error: error?.message || null });
  }

  // ── Staff Members ──
  const staffMembers = [
    { name: "Maria Gonzalez", role: "Head Chef", pay_type: "salary", hourly_rate: 62000, phone: "(512) 555-0142", email: "maria.g@email.com", notes: "Certified ServSafe Manager, 12 years catering experience" },
    { name: "James Chen", role: "Sous Chef", pay_type: "salary", hourly_rate: 48000, phone: "(512) 555-0198", email: "james.c@email.com", notes: "Specializes in Asian fusion and pastry" },
    { name: "Ashley Williams", role: "Event Captain", pay_type: "hourly", hourly_rate: 28, phone: "(512) 555-0231", email: "ashley.w@email.com", notes: "Excellent with VIP clients, bilingual English/Spanish" },
    { name: "Marcus Johnson", role: "Server", pay_type: "hourly", hourly_rate: 22, phone: "(512) 555-0177", email: "marcus.j@email.com", notes: "Available weekends, TABC certified" },
    { name: "Sophie Rivera", role: "Server", pay_type: "hourly", hourly_rate: 22, phone: "(512) 555-0263", email: "sophie.r@email.com", notes: "Available Fri-Sun" },
    { name: "David Park", role: "Bartender", pay_type: "hourly", hourly_rate: 30, phone: "(512) 555-0315", email: "david.p@email.com", notes: "TABC certified, craft cocktail specialist" },
    { name: "Rachel Adams", role: "Prep Cook", pay_type: "hourly", hourly_rate: 18, phone: "(512) 555-0289", email: "rachel.a@email.com", notes: "Culinary school student, fast learner" },
    { name: "Carlos Mendez", role: "Kitchen Porter", pay_type: "hourly", hourly_rate: 16, phone: "(512) 555-0344", email: null, notes: "Reliable, owns transport" },
  ];

  const staffResults = [];
  for (const s of staffMembers) {
    const { error } = await supabase.from("staff_members").insert({
      user_id: user.id,
      organization_id: orgId,
      name: s.name,
      role: s.role,
      pay_type: s.pay_type,
      hourly_rate: s.hourly_rate,
      phone: s.phone,
      email: s.email,
      notes: s.notes,
    });
    staffResults.push({ name: s.name, error: error?.message || null });
  }

  return NextResponse.json({ recipes: recipeResults, staff: staffResults });
}
