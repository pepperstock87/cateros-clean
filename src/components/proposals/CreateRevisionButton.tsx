"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export function CreateRevisionButton({
  proposalId,
  eventId,
  isPro = false,
}: {
  proposalId: string;
  eventId: string;
  isPro?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/proposals/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, revisionNotes: notes.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create revision");
        return;
      }

      toast.success("Revision created");
      setOpen(false);
      setNotes("");
      router.push(`/proposals/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          if (!isPro) {
            toast.error("Proposal revisions are a Pro feature. Upgrade to create revisions.");
            return;
          }
          setOpen(true);
        }}
        className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3"
      >
        <GitBranch className="w-3.5 h-3.5" />
        New Revision
      </button>

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-[#182030] border border-[#2A3A5C] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#F4F1ED]">
                Create Revision
              </h2>
              <button
                onClick={() => !loading && setOpen(false)}
                className="text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#D4A373] mb-4">
              This will create a new version of this proposal with the same
              event details and pricing. You can then make changes to the new
              version.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-[#F4F1ED] mb-1.5">
                Revision Notes
                <span className="text-[#D4A373] font-normal"> (optional)</span>
              </label>
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What changed in this revision..."
                rows={3}
                className="w-full rounded-lg bg-[#0C1220] border border-[#2A3A5C] px-3 py-2 text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-1.5 text-sm py-2 px-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-3.5 h-3.5" />
                      Create Revision
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
