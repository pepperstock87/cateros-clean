/**
 * CAIN Suggestions API
 * GET: Fetch proactive suggestions for the user
 * POST: Convert a suggestion into a pending action
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestions, actionizeSuggestion } from "@/lib/cain/suggestions/engine";

export async function GET(request: NextRequest) {
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

    // Get org ID from query param (optional)
    const orgId = request.nextUrl.searchParams.get("org_id");

    // Get limit from query param (optional, default 20)
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

    const suggestions = await generateSuggestions(user.id, orgId, limit);

    return new Response(
      JSON.stringify({
        suggestions,
        count: suggestions.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate suggestions",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

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
    const { suggestion } = body;

    if (!suggestion) {
      return new Response(JSON.stringify({ error: "Suggestion is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get org ID from query param (optional)
    const orgId = request.nextUrl.searchParams.get("org_id");

    const result = await actionizeSuggestion(user.id, suggestion, orgId);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        actionId: result.actionId,
        message: "Action created and added to approval queue",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating action from suggestion:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create action",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
