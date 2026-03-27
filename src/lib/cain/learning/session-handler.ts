/**
 * CAIN Session Handler
 *
 * Orchestrates memory extraction and storage after a CAIN session completes.
 * This is the integration point between the event builder and the memory system.
 *
 * Usage:
 *   After event builder completes, call handleSessionCompletion() to extract
 *   and store learnings from the session.
 */

import { saveMemory } from "./memory-store";
import { extractMemories as extractMemoriesFromSession } from "./extractor";
import type { CainEventPlan } from "../types";

export interface SessionCompletionParams {
  userId: string;
  orgId?: string | null;
  sessionId: string;
  sessionMessages: Array<{
    role: string;
    content: string;
  }>;
  plan: CainEventPlan | null;
  rejectedActions?: Array<{
    action_type: string;
    reason?: string;
  }>;
}

/**
 * Handle session completion: extract and store all learnings.
 * Call this after CAIN finishes an event builder session.
 *
 * Returns number of memories successfully stored.
 */
export async function handleSessionCompletion(
  params: SessionCompletionParams
): Promise<number> {
  try {
    // Extract memories using heuristic rules
    const extracted = extractMemoriesFromSession({
      userId: params.userId,
      orgId: params.orgId,
      sessionMessages: params.sessionMessages,
      plan: params.plan ?? undefined,
      rejectedActions: params.rejectedActions,
    });

    if (extracted.length === 0) {
      console.log(`[CAIN Memory] No learnings extracted from session ${params.sessionId}`);
      return 0;
    }

    // Save each memory
    let savedCount = 0;

    for (const memory of extracted) {
      const result = await saveMemory({
        userId: params.userId,
        orgId: params.orgId,
        memoryType: memory.memoryType,
        category: memory.category,
        subject: memory.subject,
        content: memory.content,
        confidence: memory.confidence,
        source: params.sessionId,
      });

      if (result) {
        savedCount++;
      }
    }

    console.log(
      `[CAIN Memory] Extracted ${extracted.length} learnings, saved ${savedCount} from session ${params.sessionId}`
    );

    return savedCount;
  } catch (error) {
    console.error("[CAIN Memory] Error handling session completion:", error);
    return 0;
  }
}

/**
 * Decay old memories (should run on a schedule, e.g., nightly).
 * Reduces confidence of unused memories to prevent stale patterns.
 *
 * Returns number of memories decayed.
 */
export async function decayOldMemories(userId: string): Promise<number> {
  try {
    const { decayMemories } = await import("./memory-store");
    const decayCount = await decayMemories(userId);

    if (decayCount > 0) {
      console.log(`[CAIN Memory] Decayed ${decayCount} old memories for user ${userId}`);
    }

    return decayCount;
  } catch (error) {
    console.error("[CAIN Memory] Error decaying memories:", error);
    return 0;
  }
}

/**
 * Get memory stats for a user (e.g., for admin dashboard).
 */
export async function getMemoryStats(userId: string): Promise<{
  total: number;
  byType: Record<string, number>;
  avgConfidence: number;
  lastUpdated: string | null;
}> {
  try {
    const { getMemories, getMemoryStats: getStats } = await import("./memory-store");

    const stats = await getStats(userId);
    const allMemories = await getMemories(userId, { limit: 1000 });

    const avgConfidence =
      allMemories.length > 0
        ? allMemories.reduce((sum, m) => sum + m.confidence, 0) / allMemories.length
        : 0;

    const lastUpdated =
      allMemories.length > 0
        ? allMemories.sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0].updated_at
        : null;

    return {
      total: allMemories.length,
      byType: stats,
      avgConfidence,
      lastUpdated,
    };
  } catch (error) {
    console.error("[CAIN Memory] Error getting stats:", error);
    return {
      total: 0,
      byType: { preference: 0, pattern: 0, insight: 0, correction: 0 },
      avgConfidence: 0,
      lastUpdated: null,
    };
  }
}
