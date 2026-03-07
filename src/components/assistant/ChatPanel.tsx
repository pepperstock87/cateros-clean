"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ActionBlock {
  action: "create_event" | "create_recipe";
  data: Record<string, unknown>;
  confirmation_message: string;
}

function extractActionBlock(text: string): ActionBlock | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.action && parsed.data && parsed.confirmation_message) {
      return parsed as ActionBlock;
    }
  } catch {
    // not valid JSON yet
  }
  return null;
}

function removeJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/, "").trim();
}

function ActionCard({
  action,
  onDismiss,
}: {
  action: ActionBlock;
  onDismiss: () => void;
}) {
  const [status, setStatus] = useState<"pending" | "creating" | "done" | "error">("pending");

  async function handleConfirm() {
    setStatus("creating");
    try {
      const endpoint =
        action.action === "create_event" ? "/api/events" : "/api/recipes";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.data),
      });
      if (!res.ok) throw new Error("Failed to create");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="my-2 rounded-lg border border-brand-800/60 bg-[#1a1510] p-3">
      <p className="text-xs font-medium text-brand-300 uppercase tracking-wide mb-2">
        {action.action === "create_event" ? "Create Event" : "Create Recipe"}
      </p>
      <p className="text-sm text-[#c4b5a0] mb-3">{action.confirmation_message}</p>
      <div className="text-xs text-[#6b5a4a] bg-[#0f0d0b] rounded p-2 mb-3 max-h-32 overflow-y-auto">
        <pre className="whitespace-pre-wrap">{JSON.stringify(action.data, null, 2)}</pre>
      </div>
      {status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors"
          >
            <Check className="w-3 h-3" />
            Confirm & Create
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2e271f] hover:bg-[#3a3028] text-[#9c8876] text-xs font-medium transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Cancel
          </button>
        </div>
      )}
      {status === "creating" && (
        <div className="flex items-center gap-2 text-xs text-brand-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          Creating...
        </div>
      )}
      {status === "done" && (
        <p className="text-xs text-green-400">Created successfully!</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">Failed to create. Please try manually.</p>
      )}
    </div>
  );
}

export function ChatPanel({
  open,
  onClose,
  initialPrompt,
  suggestedPrompts,
  fullScreen = false,
  conversationId,
  initialMessages,
  onConversationCreated,
}: {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
  suggestedPrompts?: string[];
  fullScreen?: boolean;
  conversationId?: string;
  initialMessages?: Message[];
  onConversationCreated?: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dismissedActions, setDismissedActions] = useState<Set<number>>(new Set());
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialPromptUsed = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (initialPrompt && !initialPromptUsed.current && open) {
      initialPromptUsed.current = true;
      sendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, open]);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (
                data.type === "content_block_delta" &&
                data.delta?.text
              ) {
                fullText += data.delta.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullText,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed events
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);

      // Save conversation to Supabase
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get latest messages from state via a workaround (setMessages returns void)
          let allMessages: Message[] = [];
          setMessages((prev) => {
            allMessages = prev;
            return prev;
          });

          if (currentConversationId) {
            await supabase.from("ai_conversations")
              .update({ messages: allMessages, updated_at: new Date().toISOString() })
              .eq("id", currentConversationId);
          } else {
            const title = allMessages[0]?.content?.slice(0, 50) || "New conversation";
            const { data } = await supabase.from("ai_conversations")
              .insert({ user_id: user.id, title, messages: allMessages })
              .select("id")
              .single();
            if (data) {
              setCurrentConversationId(data.id);
              onConversationCreated?.(data.id);
            }
          }
        }
      } catch {
        // Silently fail on persistence errors
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  if (!open && !fullScreen) return null;

  const panelContent = (
    <>
      {/* Header */}
      {!fullScreen && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e271f]">
          <h3 className="text-sm font-semibold text-[#f5ede0]">AI Assistant</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2e271f] transition-colors"
          >
            <X className="w-4 h-4 text-[#9c8876]" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[#6b5a4a] mb-4">
              Ask me anything about your catering business.
            </p>
            {suggestedPrompts && suggestedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-1.5 rounded-full text-xs text-brand-300 border border-brand-800/40 bg-brand-950/50 hover:bg-brand-950 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          const actionBlock =
            msg.role === "assistant" ? extractActionBlock(msg.content) : null;
          const displayText =
            msg.role === "assistant" && actionBlock
              ? removeJsonBlock(msg.content)
              : msg.content;
          const isDismissed = dismissedActions.has(i);

          return (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-[#1c1814] text-[#c4b5a0] border border-[#2e271f]"
                )}
              >
                {msg.role === "assistant" ? (
                  <div
                    className="prose-chat leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(displayText) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{displayText}</div>
                )}
                {actionBlock && !isDismissed && (
                  <ActionCard
                    action={actionBlock}
                    onDismiss={() =>
                      setDismissedActions((prev) => new Set(prev).add(i))
                    }
                  />
                )}
                {msg.role === "assistant" &&
                  isStreaming &&
                  i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle" />
                  )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-[#2e271f]"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your business..."
            disabled={isStreaming}
            className="flex-1 bg-[#1c1814] border border-[#2e271f] rounded-lg px-3 py-2 text-sm text-[#f5ede0] placeholder:text-[#6b5a4a] focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </>
  );

  if (fullScreen) {
    return (
      <div className="flex flex-col h-full bg-[#0f0d0b]">{panelContent}</div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-[#0f0d0b] border-l border-[#2e271f] shadow-2xl animate-in slide-in-from-right duration-300">
        {panelContent}
      </div>
    </>
  );
}
