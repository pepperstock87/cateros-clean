"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentOrg } from "@/lib/organizations";

export async function importClients(
  records: Array<{
    first_name: string;
    last_name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    tags?: string;
    status?: string;
  }>
): Promise<{ success: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: 0, errors: ["Unauthorized"] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.current_organization_id || null;
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.first_name?.trim()) {
      errors.push(`Row ${i + 1}: first_name is required`);
      continue;
    }

    const validStatuses = ["lead", "active", "past", "archived"];
    const status = validStatuses.includes(r.status ?? "") ? r.status : "lead";

    let tags: string[] = [];
    if (r.tags?.trim()) {
      tags = r.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      organization_id: orgId,
      first_name: r.first_name.trim(),
      last_name: r.last_name?.trim() || "",
      company_name: r.company_name?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      tags,
      status,
    });

    if (error) {
      errors.push(`Row ${i + 1} (${r.first_name}): ${error.message}`);
    } else {
      success++;
    }
  }

  revalidatePath("/clients");
  return { success, errors };
}

export async function importRecipes(
  records: Array<{
    name: string;
    description?: string;
    servings?: string;
    category?: string;
  }>
): Promise<{ success: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: 0, errors: ["Unauthorized"] };

  const org = await getCurrentOrg();
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.name?.trim()) {
      errors.push(`Row ${i + 1}: name is required`);
      continue;
    }

    const servings = r.servings ? Number(r.servings) : 1;

    const { error } = await supabase.from("recipes").insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: r.name.trim(),
      description: r.description?.trim() || null,
      servings: isNaN(servings) || servings < 1 ? 1 : servings,
      category: r.category?.trim() || null,
      ingredients: [],
      total_cost: 0,
      cost_per_serving: 0,
    });

    if (error) {
      errors.push(`Row ${i + 1} (${r.name}): ${error.message}`);
    } else {
      success++;
    }
  }

  revalidatePath("/recipes");
  return { success, errors };
}

export async function importStaff(
  records: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    hourly_rate?: string;
    pay_type?: string;
  }>
): Promise<{ success: number; errors: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: 0, errors: ["Unauthorized"] };

  const org = await getCurrentOrg();
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.name?.trim()) {
      errors.push(`Row ${i + 1}: name is required`);
      continue;
    }

    const payType = r.pay_type === "salary" ? "salary" : "hourly";
    const rate = r.hourly_rate ? Number(r.hourly_rate) : 25;

    const { error } = await supabase.from("staff_members").insert({
      user_id: user.id,
      organization_id: org?.orgId || null,
      name: r.name.trim(),
      role: r.role?.trim() || "Staff",
      pay_type: payType,
      hourly_rate: isNaN(rate) ? 25 : rate,
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
    });

    if (error) {
      errors.push(`Row ${i + 1} (${r.name}): ${error.message}`);
    } else {
      success++;
    }
  }

  revalidatePath("/staff");
  return { success, errors };
}
