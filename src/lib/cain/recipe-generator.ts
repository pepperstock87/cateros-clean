import Anthropic from "@anthropic-ai/sdk";
import type { CainDraftRecipe } from "./types";

const MODEL = "claude-haiku-4-5-20251001";

interface MenuItemInput {
  name: string;
  category?: string;
}

/**
 * Generate draft recipes for unmatched menu items using a focused Claude call.
 * Returns fully structured recipe objects with ingredients, costs, and servings.
 */
export async function generateDraftRecipes(params: {
  menuItems: MenuItemInput[];
  guestCount: number;
  serviceStyle?: string;
}): Promise<CainDraftRecipe[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (params.menuItems.length === 0) return [];

  const anthropic = new Anthropic({ apiKey });

  const itemList = params.menuItems
    .map((item, i) => `${i + 1}. "${item.name}"${item.category ? ` (${item.category})` : ""}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Generate professional catering recipes for the following menu items. This is for an event with ${params.guestCount} guests${params.serviceStyle ? `, ${params.serviceStyle} service` : ""}.

Menu items:
${itemList}

For each item, return a JSON object with:
- name: recipe name (match the menu item name)
- description: 1-2 sentence description
- category: one of "Appetizers", "Mains", "Sides", "Desserts", "Drinks", "Other"
- servings: 1 (base recipe per person)
- ingredients: array of { id: "ing-N", name, quantity (per serving), unit, cost_per_unit (realistic USD), total_cost (quantity × cost_per_unit) }
- total_cost: sum of all ingredient total_costs
- cost_per_serving: same as total_cost since servings=1

Use realistic wholesale/catering ingredient costs. Include 4-8 ingredients per recipe.

Respond with ONLY a JSON array, no markdown or explanation:
[{ "name": "...", ... }, ...]`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to parse recipe generation response:", text.slice(0, 200));
    return [];
  }

  try {
    const recipes = JSON.parse(jsonMatch[0]) as Array<{
      name: string;
      description: string;
      category: string;
      servings: number;
      ingredients: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        cost_per_unit: number;
        total_cost: number;
      }>;
      total_cost: number;
      cost_per_serving: number;
    }>;

    return recipes.map((recipe, index) => {
      // Ensure costs are calculated correctly
      const ingredients = recipe.ingredients.map((ing, ingIdx) => ({
        id: ing.id || `ing-${ingIdx + 1}`,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
        total_cost: Math.round(ing.quantity * ing.cost_per_unit * 100) / 100,
      }));

      const total_cost = ingredients.reduce((s, i) => s + i.total_cost, 0);
      const servings = recipe.servings || 1;

      return {
        id: `draft-recipe-${index}`,
        menuItemName: params.menuItems[index]?.name || recipe.name,
        recipe: {
          name: recipe.name,
          description: recipe.description || "",
          category: recipe.category || "Other",
          servings,
          ingredients,
          total_cost: Math.round(total_cost * 100) / 100,
          cost_per_serving: Math.round((total_cost / servings) * 100) / 100,
        },
        approved: false,
      };
    });
  } catch (err) {
    console.error("Failed to parse recipe JSON:", err);
    return [];
  }
}
