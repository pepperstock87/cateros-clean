import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Edit, BookOpen, Package, TrendingUp, CalendarDays, PieChart } from "lucide-react";
import { DeleteRecipeButton } from "@/components/recipes/DeleteRecipeButton";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";
import { getCurrentOrg } from "@/lib/organizations";
import type { Recipe } from "@/types";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let recipeQuery = supabase.from("recipes").select("*").eq("id", id).eq("user_id", user.id);
  if (org?.orgId) recipeQuery = recipeQuery.eq("organization_id", org.orgId);
  const { data, error } = await recipeQuery.single();

  if (error || !data) notFound();
  const recipe: Recipe = data;

  // Fetch events that use this recipe in their pricing_data menuItems
  let pricedEventsQuery = supabase.from("events").select("id, name, client_name, event_date, status, guest_count, pricing_data").eq("user_id", user.id).not("pricing_data", "is", null);
  if (org?.orgId) pricedEventsQuery = pricedEventsQuery.eq("organization_id", org.orgId);
  const { data: allPricedEvents } = await pricedEventsQuery.order("event_date", { ascending: false });

  const relatedEvents = (allPricedEvents ?? []).filter(e => {
    const p = e.pricing_data as any;
    return p?.menuItems?.some((item: any) => item.name === recipe.name);
  });

  // Suggested sell prices at various margins
  const margins = [25, 30, 35, 40];

  // Margin analysis helpers
  const typicalSellPrice = recipe.cost_per_serving > 0 ? recipe.cost_per_serving / (1 - 0.30) : 0;
  const foodCostPercent = typicalSellPrice > 0 ? (recipe.cost_per_serving / typicalSellPrice) * 100 : 0;

  const getFoodCostColor = (pct: number) => {
    if (pct < 30) return { color: "text-green-400", bg: "bg-green-400", label: "Excellent" };
    if (pct <= 40) return { color: "text-yellow-400", bg: "bg-yellow-400", label: "Acceptable" };
    return { color: "text-red-400", bg: "bg-red-400", label: "High" };
  };

  const statusColors: Record<string, string> = {
    draft: "bg-[#3a3228] text-[#9c8876]",
    proposed: "bg-blue-900/30 text-blue-400",
    confirmed: "bg-green-900/30 text-green-400",
    completed: "bg-brand-900/30 text-brand-300",
    canceled: "bg-red-900/30 text-red-400",
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/recipes" className="flex items-center gap-2 text-sm text-[#9c8876] hover:text-[#f5ede0] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${recipe.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit className="w-4 h-4" />Edit
          </Link>
          <InlineSuggestion prompt={`Suggest a sell price for "${recipe.name}" which costs ${recipe.cost_per_serving.toFixed(2)} per serving. What margin should I target for this type of dish?`} label="Suggest sell price" />
          <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
        </div>
      </div>

      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">{recipe.name}</h1>
            {recipe.description && <p className="text-sm text-[#9c8876] mt-1">{recipe.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {recipe.category && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#251f19] text-[#9c8876]">
                {recipe.category}
              </span>
            )}
            {recipe.case_price && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800/40">
                <Package className="w-3 h-3 inline mr-0.5" />Case pricing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cost stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card p-4 text-center">
          <div className="text-xl font-semibold text-brand-300">{formatCurrency(recipe.cost_per_serving)}</div>
          <div className="text-xs text-[#9c8876] mt-1">cost per serving</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-semibold">{formatCurrency(recipe.total_cost)}</div>
          <div className="text-xs text-[#9c8876] mt-1">total cost</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-semibold">{recipe.servings}</div>
          <div className="text-xs text-[#9c8876] mt-1">servings</div>
        </div>
      </div>

      {/* Margin Analysis & Suggested Sell Prices */}
      {recipe.cost_per_serving > 0 && (() => {
        const indicator = getFoodCostColor(foodCostPercent);
        return (
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-1.5 mb-4">
              <PieChart className="w-4 h-4 text-[#9c8876]" />
              <h2 className="font-medium text-sm">Margin Analysis</h2>
            </div>

            {/* Food cost indicator */}
            <div className="bg-[#251f19] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9c8876]">Food Cost % (at 30% target margin)</span>
                <span className={`text-xs font-semibold ${indicator.color}`}>{indicator.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-[#1a1510] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${indicator.bg}`}
                    style={{ width: `${Math.min(foodCostPercent, 100)}%`, opacity: 0.7 }}
                  />
                </div>
                <span className={`text-sm font-semibold ${indicator.color} min-w-[3rem] text-right`}>
                  {foodCostPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-[#6b5a4a] mt-2">Industry standard food cost is 28-35%. Lower is more profitable.</p>
            </div>

            {/* Cost breakdown bars */}
            <div className="mb-4">
              <h3 className="text-xs text-[#9c8876] mb-2">Cost Breakdown per Serving</h3>
              <div className="space-y-2">
                {recipe.ingredients.length > 0 && (() => {
                  const sortedIngs = [...recipe.ingredients].sort((a, b) => b.total_cost - a.total_cost).slice(0, 5);
                  const maxCost = sortedIngs[0]?.total_cost || 1;
                  return sortedIngs.map(ing => {
                    const perServing = ing.total_cost / recipe.servings;
                    const pctOfMax = (ing.total_cost / maxCost) * 100;
                    return (
                      <div key={ing.id} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9c8876] w-24 truncate" title={ing.name}>{ing.name}</span>
                        <div className="flex-1 h-2 bg-[#1a1510] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-brand-500/60" style={{ width: `${pctOfMax}%` }} />
                        </div>
                        <span className="text-[11px] text-[#f5ede0] min-w-[3rem] text-right">{formatCurrency(perServing)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Suggested sell prices */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-4 h-4 text-[#9c8876]" />
                <h3 className="text-xs text-[#9c8876]">Suggested Sell Prices</h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {margins.map(m => {
                  const sellPrice = recipe.cost_per_serving / (1 - m / 100);
                  const costPct = (recipe.cost_per_serving / sellPrice) * 100;
                  const cIndicator = getFoodCostColor(costPct);
                  return (
                    <div key={m} className="bg-[#251f19] rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold text-brand-300">{formatCurrency(sellPrice)}</div>
                      <div className="text-[10px] text-[#9c8876] mt-0.5">{m}% margin</div>
                      <div className={`text-[9px] mt-1 ${cIndicator.color}`}>{costPct.toFixed(0)}% food cost</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Events Using This Recipe */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarDays className="w-4 h-4 text-[#9c8876]" />
          <h2 className="font-medium text-sm">Events Using This Recipe</h2>
          {relatedEvents.length > 0 && (
            <span className="text-xs text-[#9c8876] ml-1">({relatedEvents.length})</span>
          )}
        </div>
        {relatedEvents.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="w-8 h-8 text-[#3a3228] mx-auto mb-2" />
            <p className="text-sm text-[#6b5a4a]">Not used in any events yet</p>
            <p className="text-xs text-[#4a3f34] mt-1">
              Add this recipe as a menu item when pricing an event.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {relatedEvents.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between bg-[#251f19] rounded-lg p-3 hover:bg-[#2e271f] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#f5ede0] group-hover:text-brand-300 transition-colors truncate">
                    {event.name}
                  </div>
                  <div className="text-xs text-[#9c8876] mt-0.5">
                    {event.client_name}
                    {event.event_date && (
                      <> &middot; {new Date(event.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {event.guest_count > 0 && (
                    <span className="text-[10px] text-[#9c8876]">{event.guest_count} guests</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[event.status] || "bg-[#3a3228] text-[#9c8876]"}`}>
                    {event.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="card p-6 mb-4">
          <h2 className="font-medium text-sm mb-4">
            Ingredients <span className="text-[#9c8876]">({recipe.ingredients.length})</span>
          </h2>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 text-[10px] font-medium text-[#9c8876] uppercase tracking-wider pb-2 border-b border-[#2a2118]">
              <span className="col-span-5">Ingredient</span>
              <span className="col-span-2 text-right">Quantity</span>
              <span className="col-span-2 text-right">Unit Cost</span>
              <span className="col-span-3 text-right">Total</span>
            </div>
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="grid grid-cols-12 gap-4 text-sm py-1.5 border-b border-[#1e1a14] last:border-0">
                <span className="col-span-5 text-[#f5ede0]">{ing.name}</span>
                <span className="col-span-2 text-right text-[#9c8876]">{ing.quantity} {ing.unit}</span>
                <span className="col-span-2 text-right text-[#9c8876]">{formatCurrency(ing.cost_per_unit)}/{ing.unit}</span>
                <span className="col-span-3 text-right">{formatCurrency(ing.total_cost)}</span>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-4 text-sm pt-2">
              <span className="col-span-9 font-medium">Total</span>
              <span className="col-span-3 text-right font-semibold text-brand-300">{formatCurrency(recipe.total_cost)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Case pricing */}
      {recipe.case_price && recipe.units_per_case && (
        <div className="card p-6 mb-4">
          <div className="flex items-center gap-1.5 mb-4">
            <Package className="w-4 h-4 text-[#9c8876]" />
            <h2 className="font-medium text-sm">Case Pricing</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-lg font-semibold">{formatCurrency(recipe.case_price)}</div>
              <div className="text-xs text-[#9c8876]">case price</div>
            </div>
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-lg font-semibold">{recipe.units_per_case}</div>
              <div className="text-xs text-[#9c8876]">{recipe.case_unit_type || "units"}/case</div>
            </div>
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-brand-300">{formatCurrency(recipe.case_price / recipe.units_per_case)}</div>
              <div className="text-xs text-[#9c8876]">cost per {recipe.case_unit_type || "unit"}</div>
            </div>
            <div className="bg-[#251f19] rounded-lg p-3 text-center">
              <div className="text-lg font-semibold">{recipe.yield_percent ?? 100}%</div>
              <div className="text-xs text-[#9c8876]">yield</div>
            </div>
          </div>
          {recipe.yield_percent && recipe.yield_percent < 100 && (
            <div className="mt-3 pt-3 border-t border-[#2e271f] text-center">
              <div className="text-sm font-semibold text-brand-300">
                {formatCurrency((recipe.case_price / recipe.units_per_case) / (recipe.yield_percent / 100))}
              </div>
              <div className="text-xs text-[#9c8876]">effective cost per {recipe.case_unit_type || "unit"} (after {recipe.yield_percent}% yield)</div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-[#6b5a4a] mt-6 text-center">
        Created {new Date(recipe.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        {recipe.updated_at !== recipe.created_at && (
          <> · Updated {new Date(recipe.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
        )}
      </p>
    </div>
  );
}
