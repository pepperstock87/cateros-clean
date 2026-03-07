import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ingredients = body.ingredients || [];
  const servings = body.servings || 1;
  const total_cost = ingredients.reduce((s: number, i: any) => s + (i.total_cost || i.quantity * i.cost_per_unit || 0), 0);
  const cost_per_serving = servings > 0 ? total_cost / servings : 0;

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description || null,
      servings,
      category: body.category || null,
      ingredients,
      total_cost,
      cost_per_serving,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
