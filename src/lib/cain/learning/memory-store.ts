/**
 * CAIN Memory Store
 *
 * CRUD operations for persistent memory in the cain_memory table.
 * Memories are learned patterns, preferences, corrections, and insights
 * extracted from CAIN sessions that inform future interactions.
 */

import { createClient } from "@/lib/supabase/server";

export type MemoryType = "preference" | "pattern" | "insight" | "correction";
export type MemoryCategory =
  | "client"
  | "menu"
  | "staffing"
  | "pricing"
  | "operations"
  | "scheduling"
  | "vendor";

export interface CainMemory {
  id: string;
  user_id: string;
  organization_id: string | null;
  memory_type: MemoryType;
  category: MemoryCategory;
  subject: string | null;
  content: string;
  confidence: number; // 0.0 to 1.0
  source: string | null;
  metadata: Record<string, unknown> | null;
  times_reinforced: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveMemoryParams {
  userId: string;
  orgId?: string | null;
  memoryType: MemoryType;
  category: MemoryCategory;
  subject?: string | null;
  content: string;
  confidence?: number;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Save a new memory or reinforce an existing similar one.
 * If a memory with the same type, category, and subject exists,
 * reinforce it instead of creating a duplicate.
 */
export async function saveMemory(params: SaveMemoryParams): Promise<CainMemory | null> {
  const supabase = await createClient();

  const confidence = Math.min(params.confidence ?? 0.8, 1.0);

  // Check for existing similar memory
  const { data: existing, error: fetchError } = await supabase
    .from("cain_memory")
    .select("*")
    .eq("user_id", params.userId)
    .eq("memory_type", params.memoryType)
    .eq("category", params.category)
    .eq("subject", params.subject ?? null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Error checking for existing memory:", fetchError);
    return null;
  }

  // If similar memory exists, reinforce it instead
  if (existing) {
    return reinforceMemory(existing.id, params.userId);
  }

  // Create new memory
  const { data: newMemory, error: insertError } = await supabase
    .from("cain_memory")
    .insert({
      user_id: params.userId,
      organization_id: params.orgId ?? null,
      memory_type: params.memoryType,
      category: params.category,
      subject: params.subject ?? null,
      content: params.content,
      confidence,
      source: params.source ?? null,
      metadata: params.metadata ?? null,
      times_reinforced: 1,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error saving memory:", insertError);
    return null;
  }

  return newMemory as CainMemory;
}

export interface GetMemoriesParams {
  type?: MemoryType;
  category?: MemoryCategory;
  subject?: string;
  minConfidence?: number;
  limit?: number;
}

/**
 * Retrieve memories with optional filters.
 * Results are ordered by confidence (highest first).
 */
export async function getMemories(
  userId: string,
  filters?: GetMemoriesParams
): Promise<CainMemory[]> {
  const supabase = await createClient();
  const limit = filters?.limit ?? 50;

  let query = supabase
    .from("cain_memory")
    .select("*")
    .eq("user_id", userId);

  if (filters?.type) {
    query = query.eq("memory_type", filters.type);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.subject) {
    query = query.eq("subject", filters.subject);
  }

  if (filters?.minConfidence !== undefined) {
    query = query.gte("confidence", filters.minConfidence);
  }

  const { data, error } = await query
    .order("confidence", { ascending: false })
    .order("times_reinforced", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error retrieving memories:", error);
    return [];
  }

  return data as CainMemory[];
}

/**
 * Reinforce a memory by incrementing times_reinforced and
 * boosting confidence by 0.05 (capped at 1.0).
 * Updates last_used_at timestamp.
 */
export async function reinforceMemory(
  memoryId: string,
  userId: string
): Promise<CainMemory | null> {
  const supabase = await createClient();

  // Get current memory
  const { data: current, error: fetchError } = await supabase
    .from("cain_memory")
    .select("*")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching memory for reinforcement:", fetchError);
    return null;
  }

  if (!current) return null;

  // Update with incremented reinforcement and boosted confidence
  const newConfidence = Math.min(current.confidence + 0.05, 1.0);

  const { data: updated, error: updateError } = await supabase
    .from("cain_memory")
    .update({
      times_reinforced: current.times_reinforced + 1,
      confidence: newConfidence,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError) {
    console.error("Error reinforcing memory:", updateError);
    return null;
  }

  return updated as CainMemory;
}

/**
 * Reduce confidence for memories not used in 30+ days.
 * Helps prevent stale patterns from influencing decisions.
 */
export async function decayMemories(userId: string): Promise<number> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error: fetchError } = await supabase
    .from("cain_memory")
    .select("*")
    .eq("user_id", userId)
    .or(`last_used_at.is.null, last_used_at.lt.${thirtyDaysAgo.toISOString()}`);

  if (fetchError) {
    console.error("Error fetching memories for decay:", fetchError);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  // Update each memory's confidence with decay
  const updates = data.map((m) => ({
    id: m.id,
    confidence: Math.max(m.confidence - 0.02, 0.3), // Don't decay below 0.3
  }));

  let decayCount = 0;

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("cain_memory")
      .update({
        confidence: update.confidence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.id)
      .eq("user_id", userId);

    if (!updateError) {
      decayCount++;
    }
  }

  return decayCount;
}

/**
 * Delete a specific memory.
 * Returns true if successful.
 */
export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cain_memory")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting memory:", error);
    return false;
  }

  return true;
}

/**
 * Full-text search memories by content and subject.
 * Uses Postgres ILIKE for case-insensitive substring matching.
 */
export async function searchMemories(
  userId: string,
  query: string,
  limit: number = 10
): Promise<CainMemory[]> {
  const supabase = await createClient();

  const searchPattern = `%${query}%`;

  const { data, error } = await supabase
    .from("cain_memory")
    .select("*")
    .eq("user_id", userId)
    .or(`content.ilike.${searchPattern}, subject.ilike.${searchPattern}`)
    .order("confidence", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error searching memories:", error);
    return [];
  }

  return data as CainMemory[];
}

/**
 * Get memory count by type for a user.
 * Useful for monitoring memory accumulation.
 */
export async function getMemoryStats(userId: string): Promise<Record<MemoryType, number>> {
  const supabase = await createClient();

  const types: MemoryType[] = ["preference", "pattern", "insight", "correction"];
  const stats: Record<MemoryType, number> = {
    preference: 0,
    pattern: 0,
    insight: 0,
    correction: 0,
  };

  for (const type of types) {
    const { count, error } = await supabase
      .from("cain_memory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("memory_type", type);

    if (!error && count !== null) {
      stats[type] = count;
    }
  }

  return stats;
}
