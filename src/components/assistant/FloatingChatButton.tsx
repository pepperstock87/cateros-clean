"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

const SUGGESTED_PROMPTS = [
  "How's my business doing?",
  "Help me price a 150-person wedding",
  "What's my average margin per event?",
  "Which recipes have the worst margins?",
];

export function FloatingChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40 flex items-center justify-center transition-all hover:scale-105"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </>
  );
}
