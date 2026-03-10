"use client";

import { useState, useTransition } from "react";
import { saveClientNotes } from "@/lib/actions/clients";
import { Save, Loader2 } from "lucide-react";

export function ClientNotesForm({
  clientName,
  initialNotes,
}: {
  clientName: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const isDirty = notes !== initialNotes;

  function handleSave() {
    startTransition(async () => {
      const result = await saveClientNotes(clientName, notes);
      if (result?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="card p-4">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        placeholder="Add notes about this client (dietary preferences, contact details, special requests...)"
        rows={4}
        className="w-full bg-[#0f0d0b] border border-[#2e271f] rounded-lg px-3 py-2.5 text-sm text-[#f5ede0] placeholder-[#6b5a4a] focus:outline-none focus:ring-1 focus:ring-[#9c8876] focus:border-[#9c8876] resize-y"
      />
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-[#6b5a4a]">
          {saved && <span className="text-emerald-400">Notes saved</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save Notes
        </button>
      </div>
    </div>
  );
}
