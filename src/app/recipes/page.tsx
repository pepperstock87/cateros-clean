import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Plus, BookOpen, BarChart3 } from "lucide-react";
import type { Recipe } from "@/types";
import { RecipeCard } from "@/components/recipes/RecipeCard";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("recipes").select("*").eq("user_id", user.id).order("name");
  const recipes: Recipe[] = data ?? [];

  const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Recipe Library</h1>
          <p className="text-sm text-[#9c8876] mt-1">{recipes.length} recipes · Track ingredient costs & per-person pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/recipes/analytics" className="btn-secondary flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" />Analytics
          </Link>
          <Link href="/recipes/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />New recipe
          </Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No recipes yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">Build your food cost library to auto-fill event pricing.</p>
          <Link href="/recipes/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Add first recipe</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.length > 0 ? categories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.filter(r => r.category === cat).map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
              </div>
            </div>
          )) : null}
          {recipes.filter(r => !r.category).length > 0 && (
            <div>
              {categories.length > 0 && <h2 className="text-xs font-medium text-[#9c8876] uppercase tracking-wider mb-3">Uncategorized</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.filter(r => !r.category).map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
