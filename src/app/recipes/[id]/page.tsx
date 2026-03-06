import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Edit } from "lucide-react";
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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link href="/recipes" className="flex items-center gap-2 text-sm text-[#9c8876] hover:text-[#f5ede0] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to library
        </Link>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn-primary flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Edit recipe
        </Link>
      </div>

      <div className="card p-6 mb-4">
        <h1 className="font-display text-2xl font-semibold">{recipe.name}</h1>
        {recipe.description && <p className="text-sm text-[#9c8876] mt-1">{recipe.description}</p>}
        {recipe.category && (
          <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-[#251f19] text-[#9c8876]">
            {recipe.category}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="card p-4 text-center">
          <div className="text-xl font-semibold text-brand-300">{formatCurrency(recipe.cost_per_serving)}</div>
          <div className="text-xs text-[#9c8876] mt-1">cost per person</div>
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

      {recipe.ingredients.length > 0 && (
        <div className="card p-6">
          <h2 className="font-medium text-sm mb-4">
            Ingredients <span className="text-[#9c8876]">({recipe.ingredients.length})</span>
          </h2>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 text-[10px] font-medium text-[#9c8876] uppercase tracking-wider pb-2 border-b border-[#2a2118]">
              <span className="col-span-2">Ingredient</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Cost</span>
            </div>
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="grid grid-cols-4 gap-4 text-sm py-1.5 border-b border-[#1e1a14] last:border-0">
                <span className="col-span-2 text-[#f5ede0]">{ing.name}</span>
                <span className="text-right text-[#9c8876]">{ing.quantity} {ing.unit}</span>
                <span className="text-right">{formatCurrency(ing.total_cost)}</span>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-4 text-sm pt-2">
              <span className="col-span-2 font-medium">Total</span>
              <span></span>
              <span className="text-right font-semibold text-brand-300">{formatCurrency(recipe.total_cost)}</span>
            </div>
          </div>
        </div>
      )}

      {recipe.case_price && (
        <div className="card p-6 mt-4">
          <h2 className="font-medium text-sm mb-4">Case Pricing</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold">{formatCurrency(recipe.case_price)}</div>
              <div className="text-xs text-[#9c8876]">case price</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{recipe.units_per_case}</div>
              <div className="text-xs text-[#9c8876]">units/case</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-brand-300">{formatCurrency(recipe.case_price / recipe.units_per_case!)}</div>
              <div className="text-xs text-[#9c8876]">cost per {recipe.case_unit_type || "unit"}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{recipe.yield_percent}%</div>
              <div className="text-xs text-[#9c8876]">yield</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-[#6b5a4a] mt-6 text-center">
        Created {new Date(recipe.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}
