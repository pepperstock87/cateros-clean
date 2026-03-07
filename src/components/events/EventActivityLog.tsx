"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CircleDollarSign,
  RefreshCw,
  UserPlus,
  UserMinus,
  FileText,
  MessageSquare,
  StickyNote,
  PlusCircle,
  Pencil,
} from "lucide-react";
import type { ActivityType } from "@/lib/activity";

interface ActivityRecord {
  id: string;
  event_id: string;
  user_id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function getIconForType(type: ActivityType) {
  switch (type) {
    case "status_change":
      return RefreshCw;
    case "pricing_update":
      return CircleDollarSign;
    case "payment_added":
      return CircleDollarSign;
    case "staff_assigned":
      return UserPlus;
    case "staff_removed":
      return UserMinus;
    case "proposal_sent":
      return FileText;
    case "proposal_responded":
      return MessageSquare;
    case "note_added":
      return StickyNote;
    case "event_created":
      return PlusCircle;
    case "event_updated":
      return Pencil;
    default:
      return Activity;
  }
}

function getColorForType(type: ActivityType): { bg: string; text: string } {
  switch (type) {
    case "status_change":
      return { bg: "bg-blue-500/15", text: "text-blue-400" };
    case "pricing_update":
      return { bg: "bg-amber-500/15", text: "text-amber-400" };
    case "payment_added":
      return { bg: "bg-green-500/15", text: "text-green-400" };
    case "staff_assigned":
      return { bg: "bg-orange-500/15", text: "text-orange-400" };
    case "staff_removed":
      return { bg: "bg-orange-500/15", text: "text-orange-400" };
    case "proposal_sent":
      return { bg: "bg-purple-500/15", text: "text-purple-400" };
    case "proposal_responded":
      return { bg: "bg-purple-500/15", text: "text-purple-400" };
    case "note_added":
      return { bg: "bg-[#6b5a4a]/20", text: "text-[#9c8876]" };
    case "event_created":
      return { bg: "bg-green-500/15", text: "text-green-400" };
    case "event_updated":
      return { bg: "bg-blue-500/15", text: "text-blue-400" };
    default:
      return { bg: "bg-[#6b5a4a]/20", text: "text-[#9c8876]" };
  }
}

function formatMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      parts.push(`${label}: ${String(value)}`);
    }
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

interface Props {
  eventId: string;
}

export function EventActivityLog({ eventId }: Props) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_activity")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setActivities(data as ActivityRecord[]);
      }
      setLoading(false);
    }

    fetchActivities();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2e271f] border-t-[#9c8876]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="h-8 w-8 text-[#6b5a4a] mb-3" />
        <p className="text-sm text-[#6b5a4a]">No activity yet</p>
        <p className="text-xs text-[#6b5a4a]/60 mt-1">
          Actions on this event will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {activities.map((item, idx) => {
        const Icon = getIconForType(item.type);
        const color = getColorForType(item.type);
        const metaString = formatMetadata(item.metadata);

        return (
          <div key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Connecting line */}
            {idx < activities.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[#2e271f]" />
            )}

            {/* Icon */}
            <div
              className={`relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${color.bg}`}
            >
              <Icon className={`h-4 w-4 ${color.text}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-[#f5ede0] leading-snug">
                  {item.description}
                </p>
                <span className="text-xs text-[#6b5a4a] flex-shrink-0 whitespace-nowrap pt-0.5">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {metaString && (
                <p className="text-xs text-[#9c8876] mt-1">{metaString}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
