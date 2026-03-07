import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { RecipeProfitability } from "@/components/recipes/RecipeProfitability";
import { getUserEntitlements } from "@/lib/entitlements";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";
import { getCurrentOrg } from "@/lib/organizations";
import type { Recipe } from "@/types";

export default async function RecipeAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const { isPro } = await getUserEntitlements();

  let recipesQuery = supabase.from("recipes").select("id, name, category, cost_per_serving, selling_price, servings").eq("user_id", user.id);
  if (org?.orgId) recipesQuery = recipesQuery.eq("organization_id", org.orgId);
  const { data } = await recipesQuery.order("name");

  const recipes = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string | null,
    cost_per_serving: (r.cost_per_serving ?? 0) as number,
    selling_price: (r.selling_price ?? 0) as number,
    servings: (r.servings ?? 0) as number,
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/recipes"
            className="flex items-center gap-2 text-sm text-[#9c8876] hover:text-[#f5ede0] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to recipes
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Recipe Analytics</h1>
              <p className="text-sm text-[#9c8876] mt-0.5">Understand your recipe profitability</p>
            </div>
          </div>
        </div>
      </div>

      {isPro ? (
        <RecipeProfitability recipes={recipes} />
      ) : (
        <UpgradePrompt
          message="Recipe analytics is a Pro feature. Upgrade to see profitability insights."
          plan="pro"
        />
      )}
    </div>
  );
}
