"use client";

import { CheckCircle2 } from "lucide-react";

type Props = {
  proposalTitle: string;
  confirmedAt: string;
};

export function AutoConfirmBadge({ proposalTitle, confirmedAt }: Props) {
  const formatted = new Date(confirmedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-950/40 border border-green-800/30 text-xs text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Auto-confirmed via proposal: <span className="font-medium text-green-300">{proposalTitle}</span>
      </span>
      <span className="text-green-600 ml-1">{formatted}</span>
    </div>
  );
}
