"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import type { ExtractionConfidence } from "@/lib/cain/types";

const CONFIDENCE_COLORS: Record<ExtractionConfidence, string> = {
  confirmed: "bg-emerald-400",
  inferred: "bg-yellow-400",
  assumed: "bg-gray-400",
};

export function EntityChip({
  label,
  value,
  confidence,
  onEdit,
}: {
  label: string;
  value: string | number | null;
  confidence: ExtractionConfidence;
  onEdit?: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== String(value ?? "") && onEdit) {
      onEdit(trimmed);
    } else {
      setEditValue(String(value ?? ""));
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-[var(--text-muted)] shrink-0 w-24 capitalize">
        {(label ?? "").replace(/_/g, " ")}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${CONFIDENCE_COLORS[confidence]}`}
          title={confidence}
        />
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setEditValue(String(value ?? ""));
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-[var(--bg-primary)] border border-[#D4A373]/40 rounded px-1.5 py-0.5 text-xs text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[#D4A373]/40"
          />
        ) : (
          <span className="text-xs text-[var(--text-primary)] truncate">
            {value ?? "—"}
          </span>
        )}
        {onEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
