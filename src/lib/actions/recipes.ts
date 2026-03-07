"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RecipeIngredient } from "@/types";
import { getCurrentOrg } from "@/lib/organizations";

function calcCosts(ingredients: RecipeIngredient[], servings: number) {
  const total_cost = ingredients.reduce((s, i) => s + i.total_cost, 0);
  return { total_cost, cost_per_serving: servings > 0 ? total_cost / servings : 0 };
}

export async function createRecipeAction(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const servings = Number(formData.get("servings"));
  const ingredients: RecipeIngredient[] = JSON.parse(formData.get("ingredients") as string || "[]");
  const { total_cost, cost_per_serving } = calcCosts(ingredients, servings);
  const casePriceRaw = formData.get("case_price") as string;
  const unitsPerCaseRaw = formData.get("units_per_case") as string;
  const org = await getCurrentOrg();
  const { error } = await supabase.from("recipes").insert({
    user_id: user.id, organization_id: org?.orgId || null, name: formData.get("name") as string,
    description: formData.get("description") as string || null,
    servings, category: formData.get("category") as string || null,
    ingredients, total_cost, cost_per_serving,
    case_price: casePriceRaw ? parseFloat(casePriceRaw) : null,
    units_per_case: unitsPerCaseRaw ? parseFloat(unitsPerCaseRaw) : null,
    case_unit_type: formData.get("case_unit_type") as string || null,
    yield_percent: formData.get("yield_percent") ? parseFloat(formData.get("yield_percent") as string) : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/recipes");
  return { success: true };
}

export async function updateRecipeAction(recipeId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const servings = Number(formData.get("servings"));
  const ingredients: RecipeIngredient[] = JSON.parse(formData.get("ingredients") as string || "[]");
  const { total_cost, cost_per_serving } = calcCosts(ingredients, servings);
  const { error } = await supabase.from("recipes").update({
    name: formData.get("name") as string, description: formData.get("description") as string || null,
    servings, category: formData.get("category") as string || null,
    ingredients, total_cost, cost_per_serving, updated_at: new Date().toISOString(),
  }).eq("id", recipeId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/recipes");
  return { success: true };
}

export async function deleteRecipeAction(recipeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/recipes");
  return { success: true };
}
