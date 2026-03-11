"use client";

import { useEffect, useRef } from "react";
import { Brain, Wrench, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import type { CainProgressEvent } from "@/lib/cain/types";

interface PlanProgressProps {
  events: CainProgressEvent[];
}

function ProgressIcon({ type }: { type: CainProgressEvent["type"] }) {
  switch (type) {
    case "thinking":
      return <Brain className="w-4 h-4 text-gray-400 flex-shrink-0" />;
    case "tool_start":
      return <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    case "tool_result":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
    case "text_delta":
      return <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    default:
      return <Brain className="w-4 h-4 text-gray-400 flex-shrink-0" />;
  }
}

function ProgressLine({ event, index }: { event: CainProgressEvent; index: number }) {
  switch (event.type) {
    case "thinking":
      return (
        <div className="flex items-start gap-3 py-2">
          <ProgressIcon type="thinking" />
          <p className="text-sm text-gray-400 italic">{event.message}</p>
        </div>
      );
    case "tool_start":
      return (
        <div className="flex items-start gap-3 py-2">
          <ProgressIcon type="tool_start" />
          <div>
            <span className="text-sm text-blue-400 font-medium">{event.tool}</span>
            <span className="text-sm text-[var(--text-muted)] ml-2">running...</span>
          </div>
        </div>
      );
    case "tool_result":
      return (
        <div className="flex items-start gap-3 py-2">
          <ProgressIcon type="tool_result" />
          <div>
            <span className="text-sm text-emerald-400 font-medium">{event.tool}</span>
            <span className="text-sm text-[var(--text-secondary)] ml-2">{event.summary}</span>
          </div>
        </div>
      );
    case "error":
      return (
        <div className="flex items-start gap-3 py-2">
          <ProgressIcon type="error" />
          <p className="text-sm text-red-400">{event.message}</p>
        </div>
      );
    case "text_delta":
      return (
        <div className="flex items-start gap-3 py-2">
          <ProgressIcon type="text_delta" />
          <p className="text-sm text-[var(--text-secondary)]">{event.text}</p>
        </div>
      );
    default:
      return null;
  }
}

export function PlanProgress({ events }: PlanProgressProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isComplete = events.some((e) => e.type === "plan_ready");
  const toolSteps = events.filter((e) => e.type === "tool_start" || e.type === "tool_result");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="max-w-3xl">
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-4">
        {!isComplete && (
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-[#D4A373]/30" />
              <div className="absolute inset-0 rounded-full border-2 border-[#D4A373] border-t-transparent animate-spin" />
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Building your event plan...
            </span>
          </div>
        )}
        {toolSteps.length > 0 && (
          <span className="text-xs text-[var(--text-muted)] tabular-nums ml-auto">
            {toolSteps.length} step{toolSteps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Progress Feed */}
      <div className="card border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]">
        <div
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto px-5 py-4 space-y-0.5 scroll-smooth"
        >
          {events.length === 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="w-4 h-4 rounded-full bg-[#D4A373]/20 animate-pulse flex-shrink-0" />
              <p className="text-sm text-[var(--text-muted)] animate-pulse">
                Initializing AI planner...
              </p>
            </div>
          )}
          {events
            .filter((e) => e.type !== "plan_ready")
            .map((event, i) => (
              <ProgressLine key={i} event={event} index={i} />
            ))}

          {/* Waiting indicator */}
          {!isComplete && events.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
