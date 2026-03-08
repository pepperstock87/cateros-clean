"use client";

import {
  CalendarPlus,
  DollarSign,
  UserPlus,
  UserMinus,
  Send,
  MessageSquare,
  StickyNote,
  RefreshCw,
  Pencil,
  Activity,
} from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  description: string;
  created_at: string;
  event_name: string | null;
  event_id: string | null;
};

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string }> = {
  event_created: { icon: CalendarPlus, color: "text-green-400" },
  event_updated: { icon: Pencil, color: "text-blue-400" },
  status_change: { icon: RefreshCw, color: "text-[#D4A373]" },
  pricing_update: { icon: DollarSign, color: "text-yellow-400" },
  payment_added: { icon: DollarSign, color: "text-green-400" },
  staff_assigned: { icon: UserPlus, color: "text-blue-400" },
  staff_removed: { icon: UserMinus, color: "text-red-400" },
  proposal_sent: { icon: Send, color: "text-[#D4A373]" },
  proposal_responded: { icon: MessageSquare, color: "text-purple-400" },
  note_added: { icon: StickyNote, color: "text-[#7A8BA8]" },
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-[#2A3A5C] mx-auto mb-2" />
        <p className="text-sm text-[#7A8BA8]">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((item, idx) => {
        const config = TYPE_CONFIG[item.type] ?? { icon: Activity, color: "text-[#7A8BA8]" };
        const Icon = config.icon;
        const isLast = idx === activities.length - 1;

        return (
          <div key={item.id} className="flex items-start gap-3 py-2.5 relative">
            {/* Timeline connector */}
            {!isLast && (
              <div className="absolute left-[11px] top-[28px] bottom-0 w-px bg-[#2A3A5C]" />
            )}

            <div className={`w-[22px] h-[22px] rounded-full border border-[#2A3A5C] bg-[#182030] flex items-center justify-center flex-shrink-0 relative z-10`}>
              <Icon className={`w-3 h-3 ${config.color}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-[#F4F1ED] leading-snug">
                {item.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.event_name && (
                  <span className="text-[10px] text-[#D4A373] truncate max-w-[150px]">
                    {item.event_name}
                  </span>
                )}
                <span className="text-[10px] text-[#7A8BA8]">
                  {getRelativeTime(item.created_at)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
