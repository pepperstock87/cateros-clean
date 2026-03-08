"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onSave: (value: string) => Promise<void>;
  label?: string;
  type?: "text" | "date" | "time" | "number" | "textarea";
};

export function InlineEditField({ value, onSave, label, type = "text" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync display value when parent value changes (e.g. after revalidation)
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      if (inputRef.current && type === "text") {
        inputRef.current.select();
      }
    }
  }, [editing, type]);

  function startEditing() {
    setDraft(displayValue);
    setEditing(true);
  }

  function cancel() {
    setDraft(displayValue);
    setEditing(false);
  }

  async function save() {
    if (draft === displayValue) {
      setEditing(false);
      return;
    }
    setSaving(true);
    // Optimistic update
    const previousValue = displayValue;
    setDisplayValue(draft);
    setEditing(false);
    try {
      await onSave(draft);
    } catch {
      // Revert on error
      setDisplayValue(previousValue);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      cancel();
    }
  }

  if (editing) {
    return (
      <div className="group">
        {label && (
          <span className="stat-label text-[10px] uppercase tracking-wider text-[#D4A373] block mb-1">
            {label}
          </span>
        )}
        <div className="flex items-start gap-1.5">
          {type === "textarea" ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="flex-1 bg-[#0C1220] border border-[#2A3A5C] focus:border-brand-600 rounded-md px-2.5 py-1.5 text-sm text-[#F4F1ED] outline-none transition-colors resize-y min-h-[60px]"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-[#0C1220] border border-[#2A3A5C] focus:border-brand-600 rounded-md px-2.5 py-1.5 text-sm text-[#F4F1ED] outline-none transition-colors min-w-0"
            />
          )}
          <button
            onClick={save}
            disabled={saving}
            className="p-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50 flex-shrink-0"
            title="Save"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="p-1.5 rounded-md bg-[#182030] hover:bg-[#2A3A5C] text-[#D4A373] transition-colors disabled:opacity-50 flex-shrink-0"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {label && (
        <span className="stat-label text-[10px] uppercase tracking-wider text-[#D4A373] block mb-1">
          {label}
        </span>
      )}
      <button
        onClick={startEditing}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F4F1ED] hover:text-brand-300 transition-colors text-left w-full min-h-[28px]"
        title="Click to edit"
      >
        <span className={`${saving ? "opacity-50" : ""} break-words`}>
          {displayValue || <span className="text-[#7A8BA8] italic">Empty</span>}
        </span>
        <Pencil className="w-3 h-3 text-[#7A8BA8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        {saving && <Loader2 className="w-3 h-3 animate-spin text-[#D4A373] flex-shrink-0" />}
      </button>
    </div>
  );
}
