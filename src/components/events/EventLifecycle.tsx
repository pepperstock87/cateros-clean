"use client";

import { CheckCircle2, Circle, FileText, Send, PartyPopper, XCircle } from "lucide-react";

const STEPS = [
  { key: "draft", label: "Draft", icon: Circle },
  { key: "proposed", label: "Proposed", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "completed", label: "Completed", icon: PartyPopper },
] as const;

const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  proposed: 1,
  confirmed: 2,
  completed: 3,
  canceled: -1,
};

export function EventLifecycle({ status }: { status: string }) {
  const currentIdx = STATUS_ORDER[status] ?? 0;

  if (status === "canceled") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/30 border border-red-900/40">
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-400">Event Canceled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isComplete
                    ? "bg-brand-500 border-brand-500"
                    : isCurrent
                    ? "border-brand-400 bg-brand-950"
                    : "border-[#2e271f] bg-[#1a1714]"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={`w-4 h-4 ${isCurrent ? "text-brand-400" : "text-[#6b5a4a]"}`} />
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isComplete || isCurrent ? "text-brand-300" : "text-[#6b5a4a]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors ${
                  i < currentIdx ? "bg-brand-500" : "bg-[#2e271f]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
