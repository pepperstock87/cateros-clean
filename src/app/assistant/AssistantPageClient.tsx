"use client";

import { ChatPanel } from "@/components/assistant/ChatPanel";

const SUGGESTED_PROMPTS = [
  "How's my business doing?",
  "Help me price a 150-person wedding",
  "What's my average margin per event?",
  "Which recipes have the worst margins?",
];

export function AssistantPageClient() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#2e271f]">
        <h1 className="text-xl font-display font-semibold text-[#f5ede0]">
          AI Assistant
        </h1>
        <p className="text-sm text-[#6b5a4a] mt-1">
          Your catering business co-pilot. Ask questions, get pricing help, and create events or recipes.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          open={true}
          onClose={() => {}}
          suggestedPrompts={SUGGESTED_PROMPTS}
          fullScreen
        />
      </div>
    </div>
  );
}
