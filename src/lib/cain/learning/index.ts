/**
 * CAIN Learning System
 *
 * Persistent memory and learning exports for the CAIN platform.
 * Includes memory storage, extraction, retrieval, and session handling.
 */

// Core memory store
export {
  saveMemory,
  getMemories,
  reinforceMemory,
  decayMemories,
  deleteMemory,
  searchMemories,
  getMemoryStats,
  type CainMemory,
  type MemoryType,
  type MemoryCategory,
} from "./memory-store";

// Extraction
export { extractMemories, type ExtractedMemory, type ExtractMemoriesParams } from "./extractor";

// Retrieval
export { retrieveRelevantMemories } from "./retriever";

// Session orchestration (re-export with different name to avoid conflict)
export {
  handleSessionCompletion,
  decayOldMemories,
  getMemoryStats as getSessionMemoryStats,
  type SessionCompletionParams,
} from "./session-handler";
