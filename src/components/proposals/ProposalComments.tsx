"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Comment = {
  id: string;
  proposal_id: string;
  author_name: string;
  author_type: "caterer" | "client";
  message: string;
  created_at: string;
};

type ProposalCommentsProps = {
  proposalId: string;
  isClient?: boolean;
  clientName?: string;
  shareToken?: string;
};

export function ProposalComments({
  proposalId,
  isClient = false,
  clientName,
  shareToken,
}: ProposalCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchComments() {
    try {
      const params = new URLSearchParams({ proposal_id: proposalId });
      if (shareToken) params.set("share_token", shareToken);
      const res = await fetch(`/api/proposals/comments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      // silent fail on fetch
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComments();
    // Poll every 30 seconds for new comments
    const interval = setInterval(fetchComments, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        proposal_id: proposalId,
        author_name: isClient ? (clientName || "Client") : "Caterer",
        author_type: isClient ? "client" : "caterer",
        message: message.trim(),
      };
      if (shareToken) body.share_token = shareToken;

      const res = await fetch("/api/proposals/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage("");
        await fetchComments();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to post comment");
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  // Admin dark theme vs client lighter theme
  const cardClass = isClient
    ? "bg-white border border-gray-200 rounded-xl"
    : "card";

  const inputClass = isClient
    ? "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
    : "w-full bg-[#0f0d0b] border border-[#2e271f] rounded-lg px-3 py-2 text-sm text-[#f5ede0] placeholder:text-[#6b5a4a] focus:outline-none focus:ring-2 focus:ring-brand-500/40";

  const buttonClass = isClient
    ? "bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
    : "btn-primary px-3 py-2 text-sm flex items-center gap-1.5";

  return (
    <div className={cardClass}>
      <div className={isClient ? "p-5" : "p-5"}>
        <h3 className={`font-medium text-sm mb-4 flex items-center gap-2 ${isClient ? "text-gray-900" : ""}`}>
          <MessageCircle className={`w-4 h-4 ${isClient ? "text-gray-400" : "text-[#9c8876]"}`} />
          Comments
          {comments.length > 0 && (
            <span className={`text-xs ${isClient ? "text-gray-400" : "text-[#9c8876]"}`}>
              ({comments.length})
            </span>
          )}
        </h3>

        {/* Comments list */}
        <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
          {loading ? (
            <div className={`flex items-center justify-center py-6 ${isClient ? "text-gray-400" : "text-[#9c8876]"}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className={`text-sm text-center py-6 ${isClient ? "text-gray-400" : "text-[#6b5a4a]"}`}>
              No comments yet. Start the conversation below.
            </p>
          ) : (
            comments.map((comment) => {
              const isCaterer = comment.author_type === "caterer";
              const bubbleClass = isClient
                ? isCaterer
                  ? "bg-amber-50 border border-amber-200/60 rounded-lg p-3"
                  : "bg-gray-50 border border-gray-200 rounded-lg p-3"
                : isCaterer
                ? "bg-[#1a1714] border border-[#2e271f] rounded-lg p-3"
                : "bg-brand-950/50 border border-brand-800/30 rounded-lg p-3";

              return (
                <div key={comment.id} className={bubbleClass}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider ${
                        isClient
                          ? isCaterer
                            ? "text-amber-600"
                            : "text-gray-500"
                          : isCaterer
                          ? "text-[#9c8876]"
                          : "text-brand-400"
                      }`}
                    >
                      {comment.author_name}
                    </span>
                    <span className={`text-[10px] ${isClient ? "text-gray-400" : "text-[#6b5a4a]"}`}>
                      {format(new Date(comment.created_at), "MMM d 'at' h:mm a")}
                    </span>
                  </div>
                  <p className={`text-sm ${isClient ? "text-gray-700" : "text-[#f5ede0]"}`}>
                    {comment.message}
                  </p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a comment..."
            className={inputClass}
          />
          <button type="submit" disabled={submitting || !message.trim()} className={buttonClass}>
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
