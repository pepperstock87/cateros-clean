"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CainDraftSnapshot } from "@/lib/cain/types";
import {
  saveCainDraft,
  loadActiveCainDraft,
  markDraftCommitted,
  markDraftAbandoned,
} from "@/lib/actions/cainDrafts";

const LS_KEY_PREFIX = "cain-draft-";
const DEBOUNCE_MS = 1500;
const SUPABASE_SYNC_MS = 5000;

export function useCainDraft(userId: string) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<CainDraftSnapshot | null>(
    null
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasDraft, setHasDraft] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const dirtyRef = useRef(false);
  const latestSnapshotRef = useRef<CainDraftSnapshot | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lsKey = `${LS_KEY_PREFIX}${userId}`;

  // Load draft on mount: localStorage first, then Supabase fallback
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Try localStorage
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const parsed: CainDraftSnapshot = JSON.parse(raw);
          // Only restore if it has real messages (not just welcome)
          if (parsed.messages && parsed.messages.length > 0) {
            if (!cancelled) {
              setInitialState(parsed);
              setDraftId(parsed.draftId);
              setHasDraft(true);
              setLoaded(true);
              return;
            }
          }
        }
      } catch {
        // Corrupted localStorage, continue to Supabase
      }

      // 2. Try Supabase
      try {
        const result = await loadActiveCainDraft();
        if (!cancelled && result.draft) {
          setInitialState(result.draft);
          setDraftId(result.draft.draftId);
          setHasDraft(true);
          // Also cache in localStorage for speed next time
          try {
            localStorage.setItem(lsKey, JSON.stringify(result.draft));
          } catch {
            // localStorage full, not critical
          }
        }
      } catch {
        // Network error, no draft available
      }

      if (!cancelled) setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lsKey]);

  // Debounced localStorage write + mark dirty for Supabase sync
  const persistDraft = useCallback(
    (snapshot: CainDraftSnapshot) => {
      latestSnapshotRef.current = snapshot;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        const s = latestSnapshotRef.current;
        if (!s) return;

        setSaveStatus("saving");

        // Write to localStorage immediately
        try {
          localStorage.setItem(lsKey, JSON.stringify(s));
        } catch {
          // localStorage full
        }

        dirtyRef.current = true;
        setSaveStatus("saved");
      }, DEBOUNCE_MS);
    },
    [lsKey]
  );

  // Background Supabase sync interval
  useEffect(() => {
    syncIntervalRef.current = setInterval(async () => {
      if (!dirtyRef.current || !latestSnapshotRef.current) return;
      dirtyRef.current = false;

      const snapshot = latestSnapshotRef.current;
      setSaveStatus("saving");

      try {
        const result = await saveCainDraft({
          ...snapshot,
          draftId: draftId || snapshot.draftId,
        });

        if (result.success && result.draftId) {
          setDraftId(result.draftId);
          setHasDraft(true);

          // Update localStorage with the server-assigned draftId
          const updated = {
            ...snapshot,
            draftId: result.draftId,
          };
          latestSnapshotRef.current = updated;
          try {
            localStorage.setItem(lsKey, JSON.stringify(updated));
          } catch {
            // localStorage full
          }

          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
        dirtyRef.current = true; // Retry next interval
      }
    }, SUPABASE_SYNC_MS);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [draftId, lsKey]);

  // Clear draft on successful commit
  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(lsKey);
    } catch {
      // Not critical
    }

    latestSnapshotRef.current = null;
    dirtyRef.current = false;
    setHasDraft(false);

    if (draftId) {
      try {
        await markDraftCommitted(draftId);
      } catch {
        // Non-blocking — the draft table row staying active is harmless
      }
    }

    setDraftId(null);
    setInitialState(null);
    setSaveStatus("idle");
  }, [draftId, lsKey]);

  // Abandon draft on "Start Over"
  const abandonDraft = useCallback(async () => {
    try {
      localStorage.removeItem(lsKey);
    } catch {
      // Not critical
    }

    latestSnapshotRef.current = null;
    dirtyRef.current = false;
    setHasDraft(false);

    if (draftId) {
      try {
        await markDraftAbandoned(draftId);
      } catch {
        // Non-blocking
      }
    }

    setDraftId(null);
    setInitialState(null);
    setSaveStatus("idle");
  }, [draftId, lsKey]);

  return {
    draftId,
    initialState,
    saveStatus,
    hasDraft,
    loaded,
    persistDraft,
    clearDraft,
    abandonDraft,
  };
}
