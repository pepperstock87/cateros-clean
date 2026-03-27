import Anthropic from "@anthropic-ai/sdk";
import type { CainDraftRecipe } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_ITEMS_PER_BATCH = 5;

interface MenuItemInput {
  name: string;
  category?: string;
}

interface RawRecipe {
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
}

/**
 * Generate draft recipes for unmatched menu items using a focused Claude call.
 * Batches items to avoid truncated JSON responses.
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

  // Batch items to avoid JSON truncation
  const batches: MenuItemInput[][] = [];
  for (let i = 0; i < params.menuItems.length; i += MAX_ITEMS_PER_BATCH) {
    batches.push(params.menuItems.slice(i, i + MAX_ITEMS_PER_BATCH));
  }

  console.log(`[CAIN Recipe Gen] Generating ${params.menuItems.length} recipes in ${batches.length} batch(es) for ${params.guestCount} guests...`);

  const allDrafts: CainDraftRecipe[] = [];
  let globalIndex = 0;

  for (const batch of batches) {
    const batchDrafts = await generateBatch(anthropic, batch, params.guestCount, params.serviceStyle, globalIndex);
    allDrafts.push(...batchDrafts);
    globalIndex += batch.length;
  }

  console.log(`[CAIN Recipe Gen] Generated ${allDrafts.length}/${params.menuItems.length} recipes successfully`);
  return allDrafts;
}

async function generateBatch(
  anthropic: Anthropic,
  items: MenuItemInput[],
  guestCount: number,
  serviceStyle: string | undefined,
  startIndex: number,
): Promise<CainDraftRecipe[]> {
  const itemList = items
    .map((item, i) => `${i + 1}. "${item.name}"${item.category ? ` (${item.category})` : ""}`)
    .join("\n");

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Generate professional catering recipes for these menu items. Event: ${guestCount} guests${serviceStyle ? `, ${serviceStyle} service` : ""}.

Menu items:
${itemList}

For each item return JSON with: name, description (1 sentence), category ("Appetizers"|"Mains"|"Sides"|"Desserts"|"Drinks"|"Other"), servings (1), ingredients (array of {id, name, quantity, unit, cost_per_unit, total_cost}), total_cost, cost_per_serving.

Use realistic wholesale costs. 4-6 ingredients per recipe. Keep descriptions SHORT.

Respond with ONLY a JSON array, no markdown:
[{"name":"...","description":"...","category":"...","servings":1,"ingredients":[...],"total_cost":0,"cost_per_serving":0}]`,
        },
      ],
    });
  } catch (err) {
    console.error(`[CAIN Recipe Gen] Batch API call failed:`, err instanceof Error ? err.message : err);
    return [];
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  console.log(`[CAIN Recipe Gen] Batch response: ${text.length} chars, stop: ${response.stop_reason}`);

  // If response was truncated, try to repair the JSON
  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  } else if (text.includes("[")) {
    // Truncated — try to close the JSON
    jsonStr = repairTruncatedJson(text);
  } else {
    console.error("[CAIN Recipe Gen] No JSON array found in response");
    return [];
  }

  try {
    const recipes = JSON.parse(jsonStr) as RawRecipe[];
    return recipes.map((recipe, index) => {
      const ingredients = (recipe.ingredients || []).map((ing, ingIdx) => ({
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
        id: `draft-recipe-${startIndex + index}`,
        menuItemName: items[index]?.name || recipe.name,
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
    console.error("[CAIN Recipe Gen] JSON parse failed:", err instanceof Error ? err.message : err);
    console.error("[CAIN Recipe Gen] Raw text (last 200 chars):", text.slice(-200));
    return [];
  }
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces
 */
function repairTruncatedJson(text: string): string {
  // Find the start of the array
  const arrStart = text.indexOf("[");
  if (arrStart === -1) return "[]";

  let json = text.slice(arrStart);

  // Remove any trailing incomplete object (after the last complete object)
  const lastCompleteObj = json.lastIndexOf("}");
  if (lastCompleteObj > 0) {
    json = json.slice(0, lastCompleteObj + 1);
  }

  // Remove trailing comma if present
  json = json.replace(/,\s*$/, "");

  // Close the array
  if (!json.endsWith("]")) {
    json += "]";
  }

  return json;
}
