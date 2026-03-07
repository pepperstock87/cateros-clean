"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "@/components/assistant/ChatPanel";
import { createClient } from "@/lib/supabase/client";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
  messages: any[];
};

export function AssistantPageClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<any[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const supabase = createClient();
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at, messages")
      .order("updated_at", { ascending: false })
      .limit(20);
    setConversations(data ?? []);
  }

  function handleNewChat() {
    setActiveId(null);
    setActiveMessages([]);
  }

  function handleSelectConversation(conv: Conversation) {
    setActiveId(conv.id);
    setActiveMessages(conv.messages);
  }

  async function handleDeleteConversation(id: string) {
    const supabase = createClient();
    await supabase.from("ai_conversations").delete().eq("id", id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) handleNewChat();
  }

  return (
    <div className="h-full flex">
      {/* Conversation sidebar */}
      <div className="w-64 border-r border-[#2e271f] flex flex-col bg-[#0f0d0b]">
        <div className="p-4 border-b border-[#2e271f]">
          <button onClick={handleNewChat} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-[#1c1814] hover:bg-[#1c1814] transition-colors ${activeId === conv.id ? "bg-[#1c1814]" : ""}`}
              onClick={() => handleSelectConversation(conv)}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#6b5a4a] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{conv.title}</div>
                <div className="text-[10px] text-[#6b5a4a]">{new Date(conv.updated_at).toLocaleDateString()}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[#6b5a4a] transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="px-8 py-6 border-b border-[#2e271f]">
          <h1 className="text-xl font-display font-semibold">AI Assistant</h1>
          <p className="text-sm text-[#6b5a4a] mt-1">Your catering business co-pilot</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            key={activeId ?? "new"}
            open={true}
            onClose={() => {}}
            conversationId={activeId ?? undefined}
            initialMessages={activeMessages}
            onConversationCreated={(id) => {
              setActiveId(id);
              loadConversations();
            }}
            suggestedPrompts={["How's my business doing?", "Help me price a 150-person wedding", "What's my average margin?", "Which recipes have the worst margins?"]}
            fullScreen
          />
        </div>
      </div>
    </div>
  );
}
