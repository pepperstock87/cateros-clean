import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { commitCainPlan } from "@/lib/cain/commit";
import type { CainEventPlan } from "@/lib/cain/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { plan } = body as { plan?: CainEventPlan };

    if (!plan || !plan.event || !plan.pricing) {
      return new Response(
        JSON.stringify({ error: "A valid plan with event and pricing data is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!plan.event.name || !plan.event.client_name || !plan.event.event_date || !plan.event.guest_count) {
      return new Response(
        JSON.stringify({ error: "Plan must include event name, client name, date, and guest count" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const org = await getCurrentOrg();

    const result = await commitCainPlan({
      plan,
      userId: user.id,
      orgId: org?.orgId || null,
    });

    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, eventId: result.eventId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
