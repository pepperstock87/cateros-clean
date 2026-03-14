interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

interface RecipeCore {
  servings: number;
  ingredients: RecipeIngredient[];
  total_cost: number;
  cost_per_serving: number;
}

/**
 * Scale a recipe's ingredients and costs to a target serving count.
 * Returns a new object — does not mutate.
 */
export function scaleRecipe<T extends RecipeCore>(
  recipe: T,
  targetServings: number
): T {
  if (recipe.servings <= 0 || targetServings <= 0) return recipe;
  const factor = targetServings / recipe.servings;

  const ingredients = recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: Math.round(ing.quantity * factor * 100) / 100,
    total_cost: Math.round(ing.cost_per_unit * ing.quantity * factor * 100) / 100,
  }));

  const total_cost = ingredients.reduce((s, i) => s + i.total_cost, 0);

  return {
    ...recipe,
    servings: targetServings,
    ingredients,
    total_cost: Math.round(total_cost * 100) / 100,
    cost_per_serving: Math.round((total_cost / targetServings) * 100) / 100,
  };
}

/**
 * Get the per-guest cost from a recipe.
 * This is simply the cost_per_serving — the recipe already represents one portion.
 */
export function getScaledCostPerGuest(recipe: {
  cost_per_serving: number;
}): number {
  return recipe.cost_per_serving;
}
