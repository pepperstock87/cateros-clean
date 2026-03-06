"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

export function InlineSuggestion({ prompt, label }: { prompt: string; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-300 border border-brand-800/40 bg-brand-950/50 hover:bg-brand-950 transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        {label}
      </button>
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        initialPrompt={prompt}
      />
    </>
  );
}
