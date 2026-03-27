/**
 * CAIN Actions Detail API
 * GET: Get action details
 * PATCH: Approve or reject action
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAction, approveAction, rejectAction } from "@/lib/cain/actions/queue";

interface PatchRequestBody {
  status: "approved" | "rejected";
  reason?: string;
  input?: Record<string, unknown>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await getAction(id, user.id);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ action: result.action }), {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json()) as PatchRequestBody;

    if (!body.status || (body.status !== "approved" && body.status !== "rejected")) {
      return new Response(
        JSON.stringify({ error: "Status must be 'approved' or 'rejected'" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let result;

    if (body.status === "approved") {
      result = await approveAction(id, user.id, body.input);
    } else {
      result = await rejectAction(id, user.id, body.reason);
    }

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
