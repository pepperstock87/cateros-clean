"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  guestCount: number;
  eventType?: string;
  currentStaffCount: number;
};

function getServerRatio(eventType?: string): number {
  switch (eventType?.toLowerCase()) {
    case "plated dinner":
    case "plated":
      return 15;
    case "buffet":
      return 30;
    case "cocktail":
    case "cocktail reception":
      return 25;
    default:
      return 20;
  }
}

export function StaffingSuggestion({ guestCount, eventType, currentStaffCount }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const serverRatio = getServerRatio(eventType);
  const suggestedServers = Math.max(1, Math.ceil(guestCount / serverRatio));
  const suggestedKitchen = Math.max(1, Math.ceil(guestCount / 50));
  const totalSuggested = suggestedServers + suggestedKitchen;

  const isAdequate = currentStaffCount >= totalSuggested;
  const deficit = totalSuggested - currentStaffCount;

  const statusColor = isAdequate ? "text-green-400" : "text-yellow-400";
  const statusBg = isAdequate ? "bg-green-900/20 border-green-800/40" : "bg-yellow-900/20 border-yellow-800/40";

  return (
    <div className={`rounded-lg border ${statusBg} mb-4`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${statusColor}`} />
          <span className={`text-sm font-medium ${statusColor}`}>
            {isAdequate ? "Staffing on track" : `Consider adding ${deficit} more staff`}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-[#7A8BA8]" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[#7A8BA8]" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 text-xs text-[#D4A373] space-y-1 border-t border-[#2A3A5C] pt-2">
          <p>
            Recommended: {suggestedServers} server{suggestedServers !== 1 ? "s" : ""} + {suggestedKitchen} kitchen staff for {guestCount} guests
          </p>
          <p className="text-[#7A8BA8]">
            Based on 1 server per {serverRatio} guests{eventType ? ` (${eventType})` : ""}, 1 kitchen per 50 guests
          </p>
          <p className="text-[#7A8BA8]">
            Currently assigned: {currentStaffCount}
          </p>
        </div>
      )}
    </div>
  );
}
