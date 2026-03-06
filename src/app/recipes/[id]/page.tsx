import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Edit, BookOpen, Package, TrendingUp } from "lucide-react";
import { DeleteRecipeButton } from "@/components/recipes/DeleteRecipeButton";
import { InlineSuggestion } from "@/components/assistant/InlineSuggestion";
import type { Recipe } from "@/types";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) notFound();
  const recipe: Recipe = data;

  // Suggested sell prices at various margins
  const margins = [25, 30, 35, 40];

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

      {/* Suggested sell prices */}
      {recipe.cost_per_serving > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-[#9c8876]" />
            <h2 className="font-medium text-sm">Suggested Sell Prices</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {margins.map(m => {
              const sellPrice = recipe.cost_per_serving / (1 - m / 100);
              return (
                <div key={m} className="bg-[#251f19] rounded-lg p-3 text-center">
                  <div className="text-sm font-semibold text-brand-300">{formatCurrency(sellPrice)}</div>
                  <div className="text-[10px] text-[#9c8876] mt-0.5">{m}% margin</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
