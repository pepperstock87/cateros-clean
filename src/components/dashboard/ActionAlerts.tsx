"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export type AlertItem = {
  id: string;
  type: "warning" | "info" | "urgent";
  title: string;
  description: string;
  link?: string;
  eventName?: string;
};

interface ActionAlertsProps {
  alerts: AlertItem[];
}

const ALERT_CONFIG = {
  urgent: {
    icon: AlertCircle,
    dot: "bg-red-400",
    text: "text-red-400",
    border: "border-red-500/20",
    hoverBg: "hover:bg-red-950/20",
    badge: "text-red-400 bg-red-400/10",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-amber-400",
    text: "text-amber-400",
    border: "border-amber-500/20",
    hoverBg: "hover:bg-amber-950/20",
    badge: "text-amber-400 bg-amber-400/10",
  },
  info: {
    icon: Info,
    dot: "bg-blue-400",
    text: "text-blue-400",
    border: "border-blue-500/20",
    hoverBg: "hover:bg-blue-950/20",
    badge: "text-blue-400 bg-blue-400/10",
  },
} as const;

const INITIAL_SHOW = 3;

export function ActionAlerts({ alerts }: ActionAlertsProps) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="card border-green-500/20 bg-green-950/10 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-400">All clear!</p>
            <p className="text-xs text-[#9c8876] mt-0.5">No action items right now.</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort: urgent first, then warning, then info
  const sorted = [...alerts].sort((a, b) => {
    const order = { urgent: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_SHOW);
  const remaining = sorted.length - INITIAL_SHOW;

  // Determine overall card style from highest priority alert
  const hasUrgent = sorted.some(a => a.type === "urgent");
  const cardBorder = hasUrgent ? "border-red-500/30" : "border-amber-500/30";
  const cardBg = hasUrgent ? "bg-red-950/10" : "bg-amber-950/10";
  const headerColor = hasUrgent ? "text-red-400" : "text-amber-400";

  return (
    <div className={`card ${cardBorder} ${cardBg} p-4 md:p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className={`w-4 h-4 ${headerColor}`} />
        <h2 className={`font-medium text-xs md:text-sm ${headerColor} uppercase tracking-wider`}>
          Action Items
        </h2>
        <span className={`text-[10px] ${headerColor} bg-white/5 px-1.5 py-0.5 rounded-full`}>
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((alert) => {
          const config = ALERT_CONFIG[alert.type];
          const Wrapper = alert.link ? Link : "div";
          const wrapperProps = alert.link ? { href: alert.link } : {};

          return (
            <Wrapper
              key={alert.id}
              {...(wrapperProps as any)}
              className={`flex items-center gap-3 p-3 rounded-lg ${config.hoverBg} transition-colors border ${config.border} ${alert.link ? "cursor-pointer" : ""}`}
            >
              <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{alert.title}</div>
                <div className={`text-[10px] md:text-xs ${config.text} opacity-70`}>
                  {alert.description}
                </div>
              </div>
              {alert.link && (
                <span className={`text-[10px] md:text-xs ${config.badge} px-2 py-0.5 rounded-full flex-shrink-0`}>
                  View
                </span>
              )}
            </Wrapper>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-3 text-xs text-[#9c8876] hover:text-[#f5ede0] transition-colors mx-auto"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show {remaining} more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
