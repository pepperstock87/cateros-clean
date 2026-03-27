/**
 * CAIN Actions API
 * GET: List pending actions
 * POST: Propose a new action
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPendingActions, proposeAction } from "@/lib/cain/actions/queue";
import type { CainProposeActionRequest } from "@/lib/cain/actions/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get organization ID from query param (optional)
    const orgId = request.nextUrl.searchParams.get("org_id");

    // Get status filter (optional, defaults to pending)
    const statusFilter = request.nextUrl.searchParams.get("status") || "pending";

    const client = await createClient();
    let query = client
      .from("cain_pending_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ actions: data || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as CainProposeActionRequest;

    // Validate required fields
    if (!body.action_type || !body.title || !body.payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action_type, title, payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await proposeAction(user.id, body, body.organization_id);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, actionId: result.actionId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
