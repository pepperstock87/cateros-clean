"use client";

import type { CainTimelineItem } from "@/lib/cain/types";

interface TimelinePreviewProps {
  items: CainTimelineItem[];
}

const PHASE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  prep: { label: "Kitchen Prep", color: "border-orange-500/30", dot: "bg-orange-500" },
  setup: { label: "Setup", color: "border-blue-500/30", dot: "bg-blue-500" },
  ceremony: { label: "Ceremony", color: "border-purple-500/30", dot: "bg-purple-500" },
  cocktail: { label: "Cocktail Hour", color: "border-amber-500/30", dot: "bg-amber-500" },
  service: { label: "Service", color: "border-green-500/30", dot: "bg-green-500" },
  dessert: { label: "Dessert", color: "border-pink-500/30", dot: "bg-pink-500" },
  breakdown: { label: "Breakdown", color: "border-gray-500/30", dot: "bg-gray-500" },
};

function getPhaseConfig(phase: string) {
  return PHASE_CONFIG[phase.toLowerCase()] || { label: phase, color: "border-gray-500/30", dot: "bg-gray-400" };
}

export function TimelinePreview({ items }: TimelinePreviewProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] pt-3">No timeline items generated.</p>
    );
  }

  // Group by phase, maintaining order
  const phases: Array<{ phase: string; items: CainTimelineItem[] }> = [];
  let currentPhase = "";
  for (const item of items) {
    if (item.phase !== currentPhase) {
      currentPhase = item.phase;
      phases.push({ phase: currentPhase, items: [] });
    }
    phases[phases.length - 1].items.push(item);
  }

  return (
    <div className="space-y-4 pt-3">
      {phases.map((group, gi) => {
        const config = getPhaseConfig(group.phase);
        return (
          <div key={gi}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {config.label}
              </span>
            </div>
            <div className={`border-l-2 ${config.color} ml-1 pl-4 space-y-2`}>
              {group.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] w-12 shrink-0 pt-0.5">
                    {item.start_time || "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)]">{item.task}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {item.assigned_to && (
                        <span className="text-[10px] text-[var(--text-muted)]">{item.assigned_to}</span>
                      )}
                      {item.duration_minutes && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {item.duration_minutes >= 60
                            ? `${Math.floor(item.duration_minutes / 60)}h${item.duration_minutes % 60 > 0 ? ` ${item.duration_minutes % 60}m` : ""}`
                            : `${item.duration_minutes}m`}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-[var(--text-muted)] italic mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
