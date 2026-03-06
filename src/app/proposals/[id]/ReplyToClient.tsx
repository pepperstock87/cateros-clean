"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToClientAction } from "@/lib/actions/proposals";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReplyToClient({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    const result = await replyToClientAction(proposalId, message);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Reply sent");
      setMessage("");
      router.refresh();
    }
    setSending(false);
  }

  return (
    <div className="card p-4">
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1 text-sm"
          placeholder="Reply to client..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send
        </button>
      </div>
    </div>
  );
}
