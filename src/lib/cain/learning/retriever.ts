/**
 * CAIN Memory Retriever
 *
 * Retrieves relevant memories and formats them for injection into
 * the CAIN system prompt or context. Memories are ordered by relevance
 * and confidence.
 */

import { getMemories, searchMemories } from "./memory-store";
import type { CainMemory } from "./memory-store";

export interface RetrieveMemoriesParams {
  userId: string;
  orgId?: string | null;
  brief?: string;
  clientId?: string;
  eventType?: string;
  limit?: number;
}

/**
 * Retrieve relevant memories and format as a context block.
 * Returns a formatted markdown section ready for system prompt injection.
 *
 * Strategy:
 * 1. Load all high-confidence memories (>0.7)
 * 2. If client specified, prioritize client-related memories
 * 3. If brief contains keywords, search for matching memories
 * 4. Format as markdown for injection
 */
export async function retrieveRelevantMemories(params: RetrieveMemoriesParams): Promise<string> {
  const limit = params.limit ?? 15;
  const memories: CainMemory[] = [];
  const seen = new Set<string>();

  // First: Get high-confidence memories
  const allMemories = await getMemories(params.userId, {
    minConfidence: 0.7,
    limit: 50,
  });

  // Second: If client specified, prioritize client memories
  if (params.clientId) {
    const clientMemories = allMemories.filter(
      (m) => m.subject?.includes(params.clientId || "") || m.category === "client"
    );

    for (const m of clientMemories) {
      if (memories.length < limit && !seen.has(m.id)) {
        memories.push(m);
        seen.add(m.id);
      }
    }
  }

  // Third: If brief has keywords, search for matches
  if (params.brief) {
    const keywords = extractKeywords(params.brief);

    for (const keyword of keywords) {
      if (memories.length >= limit) break;

      const searchResults = await searchMemories(params.userId, keyword, 10);

      for (const m of searchResults) {
        if (memories.length < limit && !seen.has(m.id)) {
          memories.push(m);
          seen.add(m.id);
        }
      }
    }
  }

  // Fourth: Fill remaining slots with top-confidence memories
  for (const m of allMemories) {
    if (memories.length >= limit) break;
    if (!seen.has(m.id)) {
      memories.push(m);
      seen.add(m.id);
    }
  }

  // Format and return
  if (memories.length === 0) {
    return "";
  }

  return formatMemoriesAsContext(memories);
}

/**
 * Format memories as a markdown section for system prompt injection.
 */
function formatMemoriesAsContext(memories: CainMemory[]): string {
  const lines: string[] = ["## Your Memory"];
  lines.push("Based on past interactions, here are things you've learned:\n");

  // Group by type for better organization
  const byType = new Map<string, CainMemory[]>();

  for (const m of memories) {
    const key = m.memory_type;
    if (!byType.has(key)) {
      byType.set(key, []);
    }
    byType.get(key)!.push(m);
  }

  // Format each type section
  const typeOrder = ["preference", "pattern", "insight", "correction"];

  for (const type of typeOrder) {
    const typed = byType.get(type) || [];
    if (typed.length === 0) continue;

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    lines.push(`**${typeLabel}:**`);

    for (const m of typed) {
      const confidence = getConfidenceLabel(m.confidence);
      const subject = m.subject ? ` (${m.subject})` : "";
      lines.push(`- [${confidence}] ${m.content}${subject}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Helper: Convert confidence score to label.
 */
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Highly Confident";
  if (confidence >= 0.8) return "Confident";
  if (confidence >= 0.7) return "Moderate";
  return "Low Confidence";
}

/**
 * Helper: Extract keywords from brief for memory search.
 * Looks for domain-specific terms (staff roles, menu items, event types, etc.)
 */
function extractKeywords(brief: string): string[] {
  const keywords: string[] = [];

  // Common catering keywords
  const patterns = [
    /\b(wedding|corporate|birthday|anniversary|gala|brunch|dinner|lunch|cocktail|reception|conference|seminar)\b/gi,
    /\b(bartender|server|chef|catering|staff|personnel)\b/gi,
    /\b(menu|appetizer|entree|dessert|bar|beverage|wine|cocktail)\b/gi,
    /\b(vegetarian|vegan|gluten-free|kosher|halal|allergy|dietary)\b/gi,
    /\b(pricing|budget|cost|margin|profit|discount)\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = brief.match(pattern);
    if (matches) {
      keywords.push(...matches.map((m) => m.toLowerCase()));
    }
  }

  // Remove duplicates and limit to 5 keywords
  return [...new Set(keywords)].slice(0, 5);
}
