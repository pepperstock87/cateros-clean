"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CainEventPlan, CainProgressEvent } from "@/lib/cain/types";
import { EventBriefInput } from "./components/EventBriefInput";
import { PlanProgress } from "./components/PlanProgress";
import { PlanReview } from "./components/PlanReview";

type Phase = "input" | "generating" | "review";

export function CainPageClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [plan, setPlan] = useState<CainEventPlan | null>(null);
  const [progressEvents, setProgressEvents] = useState<CainProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (brief: string, constraints?: { maxBudget?: number; dietaryRestrictions?: string }) => {
      setPhase("generating");
      setProgressEvents([]);
      setError(null);
      setPlan(null);

      try {
        const res = await fetch("/api/cain/event-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief, ...constraints }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event: CainProgressEvent = JSON.parse(jsonStr);
              setProgressEvents((prev) => [...prev, event]);

              if (event.type === "plan_ready") {
                setPlan(event.plan);
                setPhase("review");
              } else if (event.type === "error") {
                setError(event.message);
                toast.error(event.message);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error(message);
      }
    },
    []
  );

  const handleCommit = useCallback(
    async (finalPlan: CainEventPlan) => {
      try {
        const res = await fetch("/api/cain/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: finalPlan }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || "Failed to create event");
        }

        const { eventId } = await res.json();
        toast.success("Event created successfully");
        router.push(`/events/${eventId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create event";
        toast.error(message);
      }
    },
    [router]
  );

  const handleRetry = useCallback(() => {
    setPhase("input");
    setError(null);
    setProgressEvents([]);
    setPlan(null);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A373] to-[#b8844f] flex items-center justify-center shadow-lg shadow-[#D4A373]/20">
            <span className="text-lg font-bold text-[#0B1120]">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
              C.A.I.N
            </h1>
            <p className="text-xs text-[var(--text-muted)] tracking-wide uppercase">
              Catering AI Navigator
            </p>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-3 max-w-2xl">
          Describe your event in natural language and let AI build a complete plan — menu, staffing,
          rentals, timeline, and pricing — ready for review and one-click creation.
        </p>
      </div>

      {/* Phase Content */}
      {phase === "input" && (
        <EventBriefInput onSubmit={handleSubmit} />
      )}

      {phase === "generating" && (
        <div className="space-y-6">
          <PlanProgress events={progressEvents} />
          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-800/30 text-red-300 hover:bg-red-800/50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "review" && plan && (
        <PlanReview
          plan={plan}
          onCommit={handleCommit}
          onStartOver={handleRetry}
        />
      )}
    </div>
  );
}
