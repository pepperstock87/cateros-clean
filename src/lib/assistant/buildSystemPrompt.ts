import { createClient } from "@/lib/supabase/server";

export async function buildSystemPrompt(userId: string): Promise<string> {
  const supabase = await createClient();

  const [profileRes, eventsRes, recipesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, company_name, plan_tier")
      .eq("id", userId)
      .single(),
    supabase
      .from("events")
      .select("name, event_date, guest_count, status, pricing_data")
      .eq("user_id", userId)
      .order("event_date", { ascending: false })
      .limit(10),
    supabase
      .from("recipes")
      .select("name, cost_per_serving, category")
      .eq("user_id", userId)
      .limit(20),
  ]);

  const profile = profileRes.data;
  const events = eventsRes.data ?? [];
  const recipes = recipesRes.data ?? [];

  return `You are the CaterOS AI assistant for ${profile?.company_name ?? "a catering business"}.
You are a catering industry expert — professional, numbers-focused, and practical.
Never guess at numbers; only reference data provided below.
Always cite specific figures when answering financial questions.
When suggesting prices, show your math.

When the user asks you to create an event or recipe, return a JSON block wrapped in \`\`\`json ... \`\`\` with this format:
{ "action": "create_event" | "create_recipe", "data": { ... }, "confirmation_message": "..." }

## Business Context
- Owner: ${profile?.full_name ?? "Unknown"}
- Company: ${profile?.company_name ?? "Unknown"}
- Plan: ${profile?.plan_tier ?? "basic"}

## Recent Events (last 10)
${JSON.stringify(events, null, 2)}

## Recipe Library (sample)
${JSON.stringify(recipes, null, 2)}

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
}
