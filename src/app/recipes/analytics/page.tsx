import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { RecipeProfitability } from "@/components/recipes/RecipeProfitability";
import { getCurrentOrg } from "@/lib/organizations";
import type { Recipe } from "@/types";

export default async function RecipeAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  let recipesQuery = supabase.from("recipes").select("id, name, category, cost_per_serving, servings").eq("user_id", user.id);
  if (org?.orgId) recipesQuery = recipesQuery.eq("organization_id", org.orgId);
  const { data } = await recipesQuery.order("name");

  const recipes = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    category: (r.category ?? null) as string | null,
    cost_per_serving: Number(r.cost_per_serving ?? 0),
    selling_price: Number(r.selling_price ?? r.cost_per_serving ?? 0),
    servings: Number(r.servings ?? 0),
  }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/recipes"
            className="flex items-center gap-2 text-sm text-[#D4A373] hover:text-[#F4F1ED] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to recipes
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-semibold">Recipe Analytics</h1>
              <p className="text-sm text-[#D4A373] mt-0.5">Understand your recipe profitability</p>
            </div>
          </div>
        </div>
      </div>

      <RecipeProfitability recipes={recipes} />
    </div>
  );
}
