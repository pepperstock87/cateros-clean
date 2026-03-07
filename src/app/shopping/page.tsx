import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, addDays } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { Event, PricingData, Recipe } from "@/types";
import { getCurrentOrg } from "@/lib/organizations";
import { ShoppingListClient } from "./ShoppingListClient";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const now = new Date();
  const weekEnd = addDays(now, 7);

  let eventsQuery = supabase.from("events").select("*").eq("user_id", user.id).eq("status", "confirmed").gte("event_date", now.toISOString().split("T")[0]).lte("event_date", weekEnd.toISOString().split("T")[0]);
  if (org?.orgId) eventsQuery = eventsQuery.eq("organization_id", org.orgId);
  let recipesQuery = supabase.from("recipes").select("*").eq("user_id", user.id);
  if (org?.orgId) recipesQuery = recipesQuery.eq("organization_id", org.orgId);

  const [eventsRes, recipesRes] = await Promise.all([
    eventsQuery.order("event_date"),
    recipesQuery,
  ]);

  const events: Event[] = eventsRes.data ?? [];
  const recipes: Recipe[] = recipesRes.data ?? [];

  // Build recipe lookup by name (lowercase)
  const recipeByName = new Map<string, Recipe>();
  for (const r of recipes) {
    recipeByName.set(r.name.toLowerCase(), r);
  }

  // Aggregate ingredients
  type AggIngredient = { name: string; quantity: number; unit: string; estimatedCost: number; sources: string[] };
  const ingredientMap = new Map<string, AggIngredient>();

  for (const event of events) {
    const pricing = event.pricing_data as PricingData | null;
    if (!pricing?.menuItems) continue;

    for (const menuItem of pricing.menuItems) {
      const recipe = recipeByName.get(menuItem.name.toLowerCase());
      if (!recipe || !recipe.ingredients) continue;

      const multiplier = event.guest_count / (recipe.servings || 1);

      for (const ing of recipe.ingredients) {
        const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
        const existing = ingredientMap.get(key);
        const qty = ing.quantity * multiplier;
        const cost = ing.cost_per_unit * qty;

        if (existing) {
          existing.quantity += qty;
          existing.estimatedCost += cost;
          if (!existing.sources.includes(event.name)) existing.sources.push(event.name);
        } else {
          ingredientMap.set(key, {
            name: ing.name,
            quantity: qty,
            unit: ing.unit,
            estimatedCost: cost,
            sources: [event.name],
          });
        }
      }
    }
  }

  const ingredients = Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const totalCost = ingredients.reduce((s, i) => s + i.estimatedCost, 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Shopping List</h1>
          <p className="text-xs md:text-sm text-[#9c8876] mt-1">
            Consolidated ingredients for {events.length} confirmed event{events.length !== 1 ? "s" : ""} in the next 7 days
          </p>
        </div>
      </div>

      {/* Events covered */}
      {events.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" /> Events Included
          </h2>
          <div className="flex flex-wrap gap-2">
            {events.map(e => (
              <span key={e.id} className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1a1714] border border-[#2e271f]">
                {e.name} — {format(new Date(e.event_date), "MMM d")} ({e.guest_count} guests)
              </span>
            ))}
          </div>
        </div>
      )}

      <ShoppingListClient ingredients={ingredients} totalCost={totalCost} />
    </div>
  );
}
