import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentOrg();

  let getQuery = supabase.from("recipes").select("*").eq("id", id).eq("user_id", user.id);
  if (org?.orgId) getQuery = getQuery.eq("organization_id", org.orgId);
  const { data, error } = await getQuery.single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await getCurrentOrg();
  const body = await req.json();

  let patchQuery = supabase
    .from("recipes")
    .update({
      name: body.name,
      description: body.description,
      category: body.category,
      servings: body.servings,
      ingredients: body.ingredients,
      total_cost: body.total_cost,
      cost_per_serving: body.cost_per_serving,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (org?.orgId) patchQuery = patchQuery.eq("organization_id", org.orgId);
  const { error } = await patchQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
