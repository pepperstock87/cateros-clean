"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";

export function DraftStatusIndicator({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "saving" || status === "error") {
      setVisible(true);
    } else if (status === "saved") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] transition-opacity duration-300 ${
        status === "error"
          ? "text-red-400"
          : status === "saving"
            ? "text-[var(--text-muted)]"
            : "text-emerald-400"
      }`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3" />
          Draft saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="w-3 h-3" />
          Save failed
        </>
      )}
    </span>
  );
}
