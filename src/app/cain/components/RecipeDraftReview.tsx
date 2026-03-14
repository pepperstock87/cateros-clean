"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import type { CainDraftRecipe } from "@/lib/cain/types";

interface RecipeDraftReviewProps {
  drafts: CainDraftRecipe[];
  onApprove: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
  onUpdateRecipe: (draftId: string, updates: Partial<CainDraftRecipe["recipe"]>) => void;
  onApproveAll: () => void;
}

export function RecipeDraftReview({
  drafts,
  onApprove,
  onDiscard,
  onUpdateRecipe,
  onApproveAll,
}: RecipeDraftReviewProps) {
  if (drafts.length === 0) return null;

  const approvedCount = drafts.filter((d) => d.approved).length;
  const allApproved = approvedCount === drafts.length;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            AI Draft Recipes
          </h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-400/15 text-blue-400">
            {approvedCount}/{drafts.length} approved
          </span>
        </div>
        {!allApproved && (
          <button
            onClick={onApproveAll}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-400/10"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Approve All
          </button>
        )}
      </div>

      <div className="divide-y divide-[var(--border)]">
        {drafts.map((draft) => (
          <DraftRecipeRow
            key={draft.id}
            draft={draft}
            onApprove={() => onApprove(draft.id)}
            onDiscard={() => onDiscard(draft.id)}
            onUpdate={(updates) => onUpdateRecipe(draft.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Individual Draft Row ----------

function DraftRecipeRow({
  draft,
  onApprove,
  onDiscard,
  onUpdate,
}: {
  draft: CainDraftRecipe;
  onApprove: () => void;
  onDiscard: () => void;
  onUpdate: (updates: Partial<CainDraftRecipe["recipe"]>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { recipe } = draft;

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <span className="text-xs font-medium text-[var(--text-primary)] flex-1">
          {recipe.name}
        </span>

        <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)]">
          {recipe.category}
        </span>

        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          ${recipe.cost_per_serving.toFixed(2)}/serving
        </span>

        {draft.approved ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5">
            <Check className="w-3 h-3" /> Approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-400/10 rounded-full px-2 py-0.5">
            <Sparkles className="w-3 h-3" /> AI Draft
          </span>
        )}

        {!draft.approved && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={onApprove}
              className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
              title="Approve"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDiscard}
              className="p-1 text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title="Discard"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 ml-6 space-y-3">
          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide block mb-1">
              Description
            </label>
            <textarea
              value={recipe.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              className="input w-full text-xs bg-[var(--bg-primary)] border-[var(--border)] rounded-md px-2 py-1.5 resize-none"
            />
          </div>

          {/* Ingredients table */}
          <div>
            <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide block mb-1">
              Ingredients ({recipe.ingredients.length})
            </label>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="text-left py-1.5 pr-2 font-medium">Name</th>
                  <th className="text-right py-1.5 pr-2 font-medium w-16">Qty</th>
                  <th className="text-left py-1.5 pr-2 font-medium w-16">Unit</th>
                  <th className="text-right py-1.5 pr-2 font-medium w-20">$/Unit</th>
                  <th className="text-right py-1.5 font-medium w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50">
                {recipe.ingredients.map((ing) => (
                  <tr key={ing.id}>
                    <td className="py-1.5 pr-2 text-[var(--text-primary)]">
                      {ing.name}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)]">
                      {ing.quantity}
                    </td>
                    <td className="py-1.5 pr-2 text-[var(--text-muted)]">
                      {ing.unit}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)]">
                      ${ing.cost_per_unit.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-primary)]">
                      ${ing.total_cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)]">
                  <td
                    colSpan={4}
                    className="py-1.5 text-right text-[var(--text-muted)] font-medium"
                  >
                    Total Cost
                  </td>
                  <td className="py-1.5 text-right text-[var(--text-primary)] font-medium">
                    ${recipe.total_cost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Servings + cost summary */}
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span>
              Servings: <strong className="text-[var(--text-primary)]">{recipe.servings}</strong>
            </span>
            <span>
              Cost/serving:{" "}
              <strong className="text-[var(--text-primary)]">
                ${recipe.cost_per_serving.toFixed(2)}
              </strong>
            </span>
            <span className="text-[10px] italic">for: {draft.menuItemName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
