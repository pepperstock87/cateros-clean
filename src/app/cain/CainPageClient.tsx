"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { toast } from "sonner";
import { Send, Loader2, RotateCcw, Sparkles, PanelRight } from "lucide-react";
import type { CainEventPlan, CainDraftSnapshot, ExtractedEntities } from "@/lib/cain/types";
import { createEntityState, mergeEntityUpdate } from "@/lib/cain/entity-extractor";
import { PlanReview } from "./components/PlanReview";
import { DraftStatusIndicator } from "./components/DraftStatusIndicator";
import { ExtractionPanel, countEntities } from "./components/ExtractionPanel";
import { useCainDraft } from "@/hooks/useCainDraft";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const QUICK_PROMPTS = [
  "Corporate event",
  "Wedding reception",
  "Private dinner",
  "Fundraiser gala",
  "Cocktail party",
];

const DEMO_RESPONSES: string[] = [
  "Great choice! For a corporate event like this, I'd typically recommend a balanced menu with 2-3 passed appetizers, a main course station, and a dessert display. Based on your guest count, I'd estimate food costs around $28-35 per person with a target margin of 32-38%.\n\nIn the full platform, I can build out the complete menu, staffing plan, timeline, and pricing — all from this conversation.\n\nWant to see how I'd structure the staffing and timeline?",
  "For staffing, I'd recommend 1 server per 15-20 guests, plus a lead captain, bartender, and back-of-house support. I'd also build a prep timeline starting 48 hours before the event, with a detailed day-of rundown.\n\nIn the full version of C.A.I.N, I'd generate the complete event plan — including a production sheet, shopping list, and client proposal — all ready to review and send.\n\nAsk your Cateros rep for a live walkthrough of the full AI planning experience.",
  "I can also analyze your menu costs in real-time, suggest pricing adjustments to hit your margin targets, and flag any staffing gaps based on the event type and guest count.\n\nThis sandbox gives you a preview of the workflow. For the full AI-powered experience — including live event building, automated proposals, and smart costing — reach out to your Cateros contact.",
];

const WELCOME_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hi, I'm C.A.I.N. — your AI event planning assistant. Tell me about the event you'd like to plan, and I'll help you build the menu, staffing, timeline, and pricing.\n\nWhat are you working on?",
    },
  ],
};

/** Extract plain text from a UIMessage's parts */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Normalize raw AI entity data into ExtractedEntity format */
function normalizeEntityUpdate(raw: Record<string, unknown>): Partial<ExtractedEntities> {
  const now = Date.now();

  function toEntity(key: string, value: unknown): { key: string; value: string | number | null; confidence: "confirmed" | "inferred" | "assumed"; source: string; updatedAt: number } {
    return {
      key,
      value: value == null ? null : typeof value === "object" ? JSON.stringify(value) : String(value),
      confidence: "inferred",
      source: "ai_extraction",
      updatedAt: now,
    };
  }

  const result: Partial<ExtractedEntities> = {};

  // Normalize record categories (event, client)
  for (const category of ["event", "client"] as const) {
    if (!raw[category] || typeof raw[category] !== "object") continue;
    const record: Record<string, ExtractedEntities["event"][string]> = {};
    for (const [k, v] of Object.entries(raw[category] as Record<string, unknown>)) {
      // If it already has the ExtractedEntity shape, use it; otherwise normalize
      if (v && typeof v === "object" && "key" in v && "value" in v) {
        record[k] = v as ExtractedEntities["event"][string];
      } else {
        record[k] = toEntity(k, v);
      }
    }
    result[category] = record;
  }

  // Normalize array categories (menu, staffing, rentals, timeline)
  for (const category of ["menu", "staffing", "rentals", "timeline"] as const) {
    if (!raw[category] || !Array.isArray(raw[category])) continue;
    result[category] = (raw[category] as unknown[]).map((item, i) => {
      if (item && typeof item === "object" && "key" in item && "value" in item) {
        return item as ExtractedEntities["menu"][number];
      }
      // Raw item — use name or index as key
      const obj = item as Record<string, unknown>;
      const key = (obj.name as string) || (obj.role as string) || `${category}-${i + 1}`;
      return toEntity(key, obj.name || obj.role || JSON.stringify(obj));
    });
  }

  // Normalize scalar categories (budget, serviceStyle)
  for (const category of ["budget", "serviceStyle"] as const) {
    if (raw[category] == null) continue;
    const v = raw[category];
    if (v && typeof v === "object" && "key" in v && "value" in v) {
      result[category] = v as ExtractedEntities["budget"];
    } else {
      result[category] = toEntity(category, v);
    }
  }

  return result;
}

/** Check if a message has any streaming text parts */
function isTextStreaming(message: UIMessage): boolean {
  return message.parts.some(
    (p) => p.type === "text" && "state" in p && p.state === "streaming"
  );
}

export function CainPageClient({ userId }: { userId: string }) {
  const router = useRouter();
  const {
    draftId,
    initialState,
    saveStatus,
    loaded,
    persistDraft,
    clearDraft,
    abandonDraft,
  } = useCainDraft(userId);

  const { markDirty, markClean } = useUnsavedChanges();

  const [plan, setPlan] = useState<CainEventPlan | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntities>(createEntityState());
  const [showExtractionPanel, setShowExtractionPanel] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isDemo] = useState(() => typeof document !== 'undefined' && document.cookie.includes('cateros-demo-session'));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const demoResponseIndex = useRef(0);

  // --- Vercel AI SDK useChat ---
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/cain/chat" }),
    messages: [WELCOME_MESSAGE],
    onToolCall: async ({ toolCall }: { toolCall: { toolName: string; input: unknown } }) => {
      if (toolCall.toolName === "finalize_plan") {
        const toolInput = toolCall.input as { plan?: CainEventPlan };
        if (toolInput.plan) {
          const p = toolInput.plan;
          p.status = "ready";
          setPlan(p);
        }
      }

      if (toolCall.toolName === "update_extracted_entities") {
        const raw = toolCall.input as Record<string, unknown>;
        const normalized = normalizeEntityUpdate(raw);
        setExtractedEntities((prev) => {
          const merged = mergeEntityUpdate(prev, normalized);
          setShowExtractionPanel(true);
          return merged;
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong");
    },
    onFinish: () => {
      textareaRef.current?.focus();
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Replace welcome message in demo mode
  useEffect(() => {
    if (isDemo) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        parts: [{
          type: "text",
          text: "Hi, I'm C.A.I.N. — your AI event planning assistant.\n\nIn this sandbox, I'm running in guided demo mode. You can ask me about event planning, menu costing, or staffing — and I'll show you how the conversation flows.\n\nFor a live walkthrough with full AI capabilities, ask your Cateros rep.\n\nTry asking me about a corporate lunch or wedding reception!",
        }],
      }]);
    }
  }, [isDemo, setMessages]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  // Restore from draft when initialState arrives
  useEffect(() => {
    if (!loaded || initialized) return;

    if (initialState && initialState.messages.length > 0) {
      setShowResumeBanner(true);
    }
    setInitialized(true);
  }, [loaded, initialState, initialized]);

  function resumeFromDraft() {
    if (!initialState) return;
    // Convert draft messages to UIMessage format
    const restored: UIMessage[] = initialState.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
    setMessages(restored);
    setPlan(initialState.plan);
    setShowReview(initialState.showReview);
    setInputText(initialState.lastInput);
    if (initialState.extractedEntities) {
      setExtractedEntities(initialState.extractedEntities);
      setShowExtractionPanel(true);
    }
    setShowResumeBanner(false);
    markDirty();
  }

  function startFresh() {
    setShowResumeBanner(false);
    abandonDraft();
    setMessages([WELCOME_MESSAGE]);
    setPlan(null);
    setShowReview(false);
    setInputText("");
    setExtractedEntities(createEntityState());
    setShowExtractionPanel(false);
    markClean();
  }

  // Autosave on state changes
  useEffect(() => {
    if (!initialized || !loaded) return;
    if (showResumeBanner) return;

    const hasContent = messages.length > 1 || plan !== null;
    if (!hasContent) return;

    const cleanMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map(({ id, role, parts }) => ({
        id,
        role: role as "user" | "assistant",
        content: parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(""),
      }));

    const snapshot: CainDraftSnapshot = {
      draftId: draftId || "",
      messages: cleanMessages,
      plan,
      showReview,
      lastInput: inputText,
      updatedAt: Date.now(),
      extractedEntities: countEntities(extractedEntities) > 0 ? extractedEntities : null,
    };

    persistDraft(snapshot);
    markDirty();
  }, [messages, plan, showReview, inputText, initialized, loaded, showResumeBanner, draftId, persistDraft, markDirty, extractedEntities]);

  // Auto-scroll
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
  }, [inputText]);

  const handleSend = useCallback(
    (text?: string) => {
      const content = text || inputText.trim();
      if (!content || isLoading) return;

      if (isDemo) {
        // Add user message
        const userMsg: UIMessage = {
          id: `demo-user-${Date.now()}`,
          role: "user" as const,
          parts: [{ type: "text" as const, text: content }],
        };
        const responseText = DEMO_RESPONSES[demoResponseIndex.current % DEMO_RESPONSES.length];
        demoResponseIndex.current++;
        const assistantMsg: UIMessage = {
          id: `demo-assistant-${Date.now()}`,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: responseText }],
        };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInputText("");
        return;
      }

      sendMessage({ text: content });
      setInputText("");
    },
    [inputText, isLoading, sendMessage, isDemo, setMessages]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
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
        markClean();
        await clearDraft();
        router.push(`/events/${eventId}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create event";
        throw new Error(message);
      }
    },
    [router, clearDraft, markClean]
  );

  const handleStartOver = useCallback(() => {
    abandonDraft();
    setMessages([WELCOME_MESSAGE]);
    setPlan(null);
    setShowReview(false);
    setInputText("");
    setExtractedEntities(createEntityState());
    setShowExtractionPanel(false);
    markClean();
  }, [abandonDraft, markClean, setMessages]);

  const handleCorrectEntity = useCallback(
    (category: string, key: string, newValue: string) => {
      setExtractedEntities((prev) => {
        const correction = {
          key,
          value: newValue,
          confidence: "confirmed" as const,
          source: "user_correction",
          updatedAt: Date.now(),
        };

        if (category === "budget" || category === "serviceStyle") {
          return mergeEntityUpdate(prev, { [category]: correction });
        }

        if (category === "event" || category === "client") {
          return mergeEntityUpdate(prev, {
            [category]: { [key]: correction },
          });
        }

        const arr = [...(prev[category as keyof Pick<ExtractedEntities, "menu" | "staffing" | "rentals" | "timeline">] || [])];
        const idx = arr.findIndex((e) => e.key === key);
        if (idx >= 0) {
          arr[idx] = correction;
        }
        return mergeEntityUpdate(prev, { [category]: arr } as Partial<ExtractedEntities>);
      });
    },
    []
  );

  const entityCount = countEntities(extractedEntities);

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
    <div className="flex h-[calc(100vh-80px)] w-full">
    {/* Chat column */}
    <div className={`flex-1 min-w-0 flex flex-col px-4 sm:px-6 mx-auto max-w-3xl`}>
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
            <DraftStatusIndicator status={saveStatus} />
          </div>
          <div className="flex items-center gap-2">
            {entityCount > 0 && (
              <button
                onClick={() => setShowExtractionPanel(!showExtractionPanel)}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)] relative"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#D4A373]/15 text-[#D4A373]">
                  {entityCount}
                </span>
              </button>
            )}
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
      </div>

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex-shrink-0 mt-4 p-4 rounded-xl border border-[#D4A373]/30 bg-[#D4A373]/5">
          <p className="text-sm text-[var(--text-primary)] font-medium mb-1">
            You have an unfinished session
          </p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Pick up where you left off, or start fresh.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={resumeFromDraft}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] hover:from-[#e0b589] hover:to-[#c99260] transition-all"
            >
              Resume
            </button>
            <button
              onClick={startFresh}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

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
            isStreaming={isLoading && message.id === messages[messages.length - 1]?.id && message.role === "assistant"}
            onReviewPlan={() => setShowReview(true)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && !showResumeBanner && (
        <div className="flex-shrink-0 pb-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
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
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          <div className="flex items-end gap-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#D4A373]/40 focus-within:border-[#D4A373] transition-all">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your event..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 resize-none outline-none leading-relaxed max-h-[160px]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] disabled:opacity-30 disabled:cursor-not-allowed hover:from-[#e0b589] hover:to-[#c99260] transition-all shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 ml-1">
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[9px] font-mono">Enter</kbd>{" "}
          to send &middot;{" "}
          <kbd className="px-1 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[9px] font-mono">Shift+Enter</kbd>{" "}
          for new line
        </p>
      </div>
    </div>

    {/* Extraction side panel */}
    {showExtractionPanel && entityCount > 0 && (
      <ExtractionPanel
        entities={extractedEntities}
        onClose={() => setShowExtractionPanel(false)}
        onCorrectEntity={handleCorrectEntity}
      />
    )}
    </div>
  );
}

// ─── Message Bubble ───

function MessageBubble({
  message,
  plan,
  isStreaming,
  onReviewPlan,
}: {
  message: UIMessage;
  plan: CainEventPlan | null;
  isStreaming: boolean;
  onReviewPlan: () => void;
}) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const toolParts = message.parts.filter((p) => isToolUIPart(p));
  const hasTools = toolParts.length > 0;
  const streaming = isStreaming || isTextStreaming(message);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-gradient-to-r from-[#D4A373]/15 to-[#D4A373]/10 border border-[#D4A373]/20 rounded-2xl rounded-br-md"
            : "bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl rounded-bl-md"
        } px-4 py-3`}
      >
        {/* Tool call indicators */}
        {!isUser && hasTools && (
          <div className="mb-3 space-y-1.5">
            {toolParts.map((part, i) => {
              // Tool part type is "tool-{toolName}", state is on the part directly
              const toolName = part.type.replace(/^tool-/, "");
              const state = "state" in part ? (part as { state: string }).state : "unknown";
              return <ToolPill key={i} invocation={{ toolName, state }} />;
            })}
          </div>
        )}

        {/* Message content */}
        {text ? (
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {text}
          </div>
        ) : streaming && !hasTools ? (
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

        {/* Streaming indicator */}
        {streaming && text && (
          <span className="inline-flex gap-0.5 ml-1 align-middle">
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-[#D4A373] animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        {/* Review plan button */}
        {!isUser && plan && !streaming && (
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

// ─── Tool Pill ───

function ToolPill({ invocation }: { invocation: { toolName: string; state: string } }) {
  const name = invocation.toolName.replace(/_/g, " ");
  const isComplete = invocation.state === "result";

  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-400/10 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {name}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-400/10 rounded-full px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      {name}
    </span>
  );
}
