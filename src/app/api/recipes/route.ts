import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Recipe name is required and must be a non-empty string" }, { status: 400 });
    }

    const ingredients = body.ingredients || [];
    const servings = body.servings || 1;

    if (!Number.isFinite(servings) || servings < 1) {
      return NextResponse.json({ error: "Servings must be a positive number" }, { status: 400 });
    }

    const total_cost = ingredients.reduce((s: number, i: any) => s + (i.total_cost || i.quantity * i.cost_per_unit || 0), 0);
    const cost_per_serving = servings > 0 ? total_cost / servings : 0;

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        servings,
        category: body.category?.trim() || null,
        ingredients,
        total_cost,
        cost_per_serving,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: "Failed to create recipe. Please check your input and try again." }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Invalid request body. Please provide valid JSON." }, { status: 400 });
  }
}
