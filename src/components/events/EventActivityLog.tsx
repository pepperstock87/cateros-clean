"use client";

import { format } from "date-fns";

interface ActivityItem {
  id: string;
  type: "created" | "status" | "payment" | "proposal" | "staff" | "note";
  title: string;
  detail?: string;
  date: string;
}

interface Props {
  activities: ActivityItem[];
}

function dotColor(type: ActivityItem["type"]): string {
  switch (type) {
    case "payment":
      return "bg-green-500";
    case "proposal":
      return "bg-blue-500";
    case "status":
      return "bg-amber-500";
    default:
      return "bg-[#6b5a4a]";
  }
}

export type { ActivityItem };

export function EventActivityLog({ activities }: Props) {
  if (activities.length === 0) return null;

  return (
    <div className="relative">
      {activities.map((item, idx) => (
        <div key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          {/* Connecting line */}
          {idx < activities.length - 1 && (
            <div className="absolute left-[3px] top-3 bottom-0 border-l border-[#2e271f]" />
          )}

          {/* Dot */}
          <div className="relative flex-shrink-0 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${dotColor(item.type)}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-[#f5ede0]">{item.title}</p>
              {item.detail && (
                <p className="text-xs text-[#6b5a4a] mt-0.5">{item.detail}</p>
              )}
            </div>
            <span className="text-xs text-[#6b5a4a] flex-shrink-0 whitespace-nowrap">
              {format(new Date(item.date), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
