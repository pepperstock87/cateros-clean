"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { CainEventPlan, CainProgressEvent } from "@/lib/cain/types";
import { PlanReview } from "./components/PlanReview";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  progressEvents?: CainProgressEvent[];
}

const QUICK_PROMPTS = [
  "Corporate event",
  "Wedding reception",
  "Private dinner",
  "Fundraiser gala",
  "Cocktail party",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm C.A.I.N. — your AI event planning assistant. Tell me about the event you'd like to plan, and I'll help you build the menu, staffing, timeline, and pricing.\n\nWhat are you working on?",
};

export function CainPageClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<CainEventPlan | null>(null);
  const [showReview, setShowReview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
      };

      // Build conversation history for the API (exclude welcome, streaming state, progress)
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.id !== "welcome" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Replace welcome message content with something the model can work with
      if (conversationHistory[0]?.content === WELCOME_MESSAGE.content) {
        conversationHistory.shift();
      }

      const assistantId = `assistant-${Date.now()}`;
      const streamingMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
        progressEvents: [],
      };

      setMessages((prev) => [...prev, userMessage, streamingMessage]);
      setInput("");
      setIsGenerating(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      try {
        const res = await fetch("/api/cain/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversationHistory }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        let accumulatedProgress: CainProgressEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event: CainProgressEvent = JSON.parse(jsonStr);

              if (event.type === "text_delta") {
                accumulatedText += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedText }
                      : m
                  )
                );
              } else if (event.type === "plan_ready") {
                setPlan(event.plan);
                // Add a message about the plan being ready
                accumulatedText += accumulatedText
                  ? "\n\nI've prepared a detailed event plan. Click below to review and customize it."
                  : "I've prepared a detailed event plan based on our conversation. Click below to review and customize it.";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulatedText, isStreaming: false }
                      : m
                  )
                );
              } else if (event.type === "error") {
                toast.error(event.message);
              } else if (
                event.type === "tool_start" ||
                event.type === "tool_result" ||
                event.type === "thinking"
              ) {
                accumulatedProgress = [...accumulatedProgress, event];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, progressEvents: accumulatedProgress }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err: unknown) {
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        const message = isAbort
          ? "Response timed out. Please try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong";
        toast.error(message);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || "Sorry, something went wrong. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        clearTimeout(timeout);
        setIsGenerating(false);
        textareaRef.current?.focus();
      }
    },
    [messages, isGenerating]
  );

  const handleSubmit = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCommit = useCallback(
    async (finalPlan: CainEventPlan) => {
      try {
        const res = await fetch("/api/cain/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: finalPlan }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || "Failed to create event");
        }

        const { eventId } = await res.json();
        toast.success("Event created successfully");
        router.push(`/events/${eventId}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create event";
        toast.error(message);
      }
    },
    [router]
  );

  const handleStartOver = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setPlan(null);
    setShowReview(false);
    setInput("");
    setIsGenerating(false);
  }, []);

  // Show plan review overlay
  if (showReview && plan) {
    return (
      <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 py-6">
        <button
          onClick={() => setShowReview(false)}
          className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          &larr; Back to conversation
        </button>
        <PlanReview
          plan={plan}
          onCommit={handleCommit}
          onStartOver={() => {
            setShowReview(false);
            handleStartOver();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl w-full h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6">
      {/* Header */}
      <div className="flex-shrink-0 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4A373] to-[#b8844f] flex items-center justify-center shadow-lg shadow-[#D4A373]/20">
              <span className="text-base font-bold text-[#0B1120]">C</span>
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-[var(--text-primary)] leading-tight">
                C.A.I.N
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] tracking-wide uppercase">
                Catering AI Navigator
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleStartOver}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New conversation
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-6 space-y-5 scroll-smooth"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            plan={plan}
            onReviewPlan={() => setShowReview(true)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts — show only when just the welcome message exists */}
      {messages.length === 1 && (
        <div className="flex-shrink-0 pb-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#D4A373]/50 hover:bg-[#D4A373]/5 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input composer */}
      <div className="flex-shrink-0 pb-4 pt-2 border-t border-[var(--border)]">
        <div className="flex items-end gap-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#D4A373]/40 focus-within:border-[#D4A373] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your event..."
            rows={1}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 resize-none outline-none leading-relaxed max-h-[160px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#e0b589] hover:to-[#c99260] transition-all shadow-sm"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 ml-1">
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[9px] font-mono">Enter</kbd>{" "}
          to send &middot;{" "}
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[9px] font-mono">Shift+Enter</kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
}

// ─── Message Bubble ───

function MessageBubble({
  message,
  plan,
  onReviewPlan,
}: {
  message: ChatMessage;
  plan: CainEventPlan | null;
  onReviewPlan: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-gradient-to-r from-[#D4A373]/15 to-[#D4A373]/10 border border-[#D4A373]/20 rounded-2xl rounded-br-md"
            : "bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl rounded-bl-md"
        } px-4 py-3`}
      >
        {/* Progress indicators (tool calls) */}
        {!isUser &&
          message.progressEvents &&
          message.progressEvents.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {message.progressEvents.map((event, i) => (
                <ProgressPill key={i} event={event} />
              ))}
            </div>
          )}

        {/* Message content */}
        {message.content ? (
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        ) : message.isStreaming ? (
          <div className="flex items-center gap-2 py-1">
            <span className="text-sm text-[var(--text-muted)] italic">
              CAIN is thinking
            </span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        ) : null}

        {/* Streaming indicator at end of content */}
        {message.isStreaming && message.content && (
          <span className="inline-flex gap-0.5 ml-1 align-middle">
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        {/* Review plan button */}
        {!isUser && plan && !message.isStreaming && message.content.includes("review") && (
          <button
            onClick={onReviewPlan}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] hover:from-[#e0b589] hover:to-[#c99260] transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Review Event Plan
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Progress Pill ───

function ProgressPill({ event }: { event: CainProgressEvent }) {
  if (event.type === "thinking") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-primary)] rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
        {event.message}
      </span>
    );
  }
  if (event.type === "tool_start") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-400/10 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        {event.tool.replace(/_/g, " ")}
      </span>
    );
  }
  if (event.type === "tool_result") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-400/10 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {event.tool.replace(/_/g, " ")}
      </span>
    );
  }
  return null;
}
