"use client";

import { useState } from "react";
import { Bookmark, Loader2, Check, X } from "lucide-react";
import { saveAsTemplateAction } from "@/lib/actions/events";
import { toast } from "sonner";

export function SaveAsTemplateButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await saveAsTemplateAction(eventId, name.trim());
    if (result.error) toast.error(result.error);
    else {
      toast.success("Template saved");
      setOpen(false);
      setName("");
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-2">
        <Bookmark className="w-4 h-4" />Save as Template
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Template name..."
        className="input text-sm py-1.5 w-40"
        autoFocus
        onKeyDown={e => e.key === "Enter" && handleSave()}
      />
      <button onClick={handleSave} disabled={saving || !name.trim()} className="text-green-400 hover:text-green-300 p-1">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button onClick={() => { setOpen(false); setName(""); }} className="text-[#6b5a4a] hover:text-[#9c8876] p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
