"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTemplate } from "@/lib/actions/templates";

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTemplate(templateId);
    if (result?.error) {
      alert(result.error);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50 transition-colors inline-flex items-center gap-1"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1.5 rounded-lg text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#1c1814] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-[#6b5a4a] hover:text-red-400 hover:bg-red-900/20 transition-colors"
      title={`Delete "${templateName}"`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
