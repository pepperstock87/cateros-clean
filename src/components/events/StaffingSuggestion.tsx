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
            {isAdequate ? "Staffing looks good" : `You may need ${deficit} more staff`}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-[#6b5a4a]" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[#6b5a4a]" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 text-xs text-[#9c8876] space-y-1 border-t border-[#2e271f] pt-2">
          <p>
            Suggested: {suggestedServers} server{suggestedServers !== 1 ? "s" : ""}, {suggestedKitchen} kitchen staff for {guestCount} guests
          </p>
          <p className="text-[#6b5a4a]">
            Ratio: 1 server per {serverRatio} guests{eventType ? ` (${eventType})` : ""} &middot; 1 chef per 50 guests
          </p>
          <p className="text-[#6b5a4a]">
            Currently assigned: {currentStaffCount} staff
          </p>
        </div>
      )}
    </div>
  );
}
