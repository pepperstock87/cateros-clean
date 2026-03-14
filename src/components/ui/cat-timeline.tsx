import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

export interface TimelineItem {
  id: string;
  time?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  status?: "completed" | "active" | "upcoming";
}

interface CatTimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function CatTimeline({ items, className }: CatTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--border)]" />

      <div className="space-y-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isCompleted = item.status === "completed";
          const isActive = item.status === "active";

          return (
            <div key={item.id} className="relative flex gap-4 pl-0">
              {/* Dot / Icon */}
              <div className="relative z-10 flex-shrink-0">
                {Icon ? (
                  <div
                    className={cn(
                      "w-[30px] h-[30px] rounded-full flex items-center justify-center border",
                      isCompleted && "bg-green-500/10 border-green-500/30 text-green-400",
                      isActive && "bg-brand-500/10 border-brand-500/30 text-brand-400",
                      !isCompleted && !isActive && "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-[30px] h-[30px] rounded-full flex items-center justify-center border",
                      isCompleted && "bg-green-500/10 border-green-500/30",
                      isActive && "bg-brand-500/10 border-brand-500/30",
                      !isCompleted && !isActive && "bg-[var(--bg-secondary)] border-[var(--border)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        isCompleted && "bg-green-400",
                        isActive && "bg-brand-400",
                        !isCompleted && !isActive && "bg-[var(--text-muted)]"
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={cn("flex-1 min-w-0 pt-1", i < items.length - 1 && "pb-2")}>
                <div className="flex items-center gap-2">
                  {item.time && (
                    <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
                      {item.time}
                    </span>
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    isActive && "text-brand-400",
                    isCompleted && "text-[var(--text-secondary)]"
                  )}>
                    {item.title}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
