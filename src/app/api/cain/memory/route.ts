/**
 * CAIN Memory Management API
 *
 * GET: List memories with optional filters (type, category, minConfidence)
 * DELETE: Delete a specific memory by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemories, deleteMemory, searchMemories } from "@/lib/cain/learning/memory-store";

/**
 * GET /api/cain/memory
 *
 * Query parameters:
 * - type: "preference" | "pattern" | "insight" | "correction"
 * - category: "client" | "menu" | "staffing" | "pricing" | "operations" | "scheduling" | "vendor"
 * - minConfidence: number (0.0-1.0)
 * - search: string (search memories by content/subject)
 * - limit: number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const minConfidence = searchParams.get("minConfidence")
      ? parseFloat(searchParams.get("minConfidence")!)
      : undefined;
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    let memories;

    if (search) {
      // Full-text search
      memories = await searchMemories(user.id, search, limit);
    } else {
      // Filtered query
      memories = await getMemories(user.id, {
        type: type as any,
        category: category as any,
        minConfidence,
        limit,
      });
    }

    return NextResponse.json({
      success: true,
      count: memories.length,
      memories,
    });
  } catch (error) {
    console.error("Error fetching memories:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cain/memory
 *
 * Body:
 * {
 *   "memoryId": "uuid"
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memoryId } = body;

    if (!memoryId) {
      return NextResponse.json(
        { error: "memoryId is required" },
        { status: 400 }
      );
    }

    // Delete memory (enforces user_id check via RLS)
    const success = await deleteMemory(memoryId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Memory not found or deletion failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Memory deleted",
    });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}
