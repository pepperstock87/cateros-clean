"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, DollarSign, Leaf } from "lucide-react";

interface EventBriefInputProps {
  onSubmit: (
    brief: string,
    constraints?: { maxBudget?: number; dietaryRestrictions?: string }
  ) => void;
  initialBrief?: string;
  initialConstraints?: { maxBudget?: number; dietaryRestrictions?: string };
}

export function EventBriefInput({ onSubmit, initialBrief, initialConstraints }: EventBriefInputProps) {
  const [brief, setBrief] = useState(initialBrief || "");
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialConstraints?.maxBudget || initialConstraints?.dietaryRestrictions)
  );
  const [maxBudget, setMaxBudget] = useState<string>(
    initialConstraints?.maxBudget ? String(initialConstraints.maxBudget) : ""
  );
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    initialConstraints?.dietaryRestrictions || ""
  );

  const canSubmit = brief.trim().length > 10;

  function handleSubmit() {
    if (!canSubmit) return;
    const constraints: { maxBudget?: number; dietaryRestrictions?: string } = {};
    if (maxBudget) constraints.maxBudget = parseFloat(maxBudget);
    if (dietaryRestrictions.trim()) constraints.dietaryRestrictions = dietaryRestrictions.trim();
    onSubmit(brief.trim(), Object.keys(constraints).length > 0 ? constraints : undefined);
  }

  return (
    <div className="max-w-3xl">
      {/* Main Input Card */}
      <div className="card border border-[var(--border)] rounded-xl p-6 bg-[var(--bg-secondary)]">
        <label htmlFor="event-brief" className="block text-sm font-medium text-[var(--text-primary)] mb-3">
          Event Brief
        </label>
        <textarea
          id="event-brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe your event... e.g., 'Wedding for 150 guests on June 12. Cocktail hour with passed hors d'oeuvres, plated dinner with beef or halibut, premium bar.'"
          rows={6}
          className="input w-full resize-none text-sm leading-relaxed placeholder:text-[var(--text-muted)]/60 bg-[var(--bg-primary)] border-[var(--border)] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#D4A373]/40 focus:border-[#D4A373] transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
              handleSubmit();
            }
          }}
        />

        {/* Character hint */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[var(--text-muted)]">
            {brief.length > 0 && brief.length <= 10
              ? "Keep going — add more detail for better results"
              : "Tip: The more detail you provide, the better the plan"}
          </p>
          <p className="text-xs text-[var(--text-muted)] tabular-nums">
            {brief.length > 0 && `${brief.length} chars`}
          </p>
        </div>

        {/* Advanced Section */}
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced Constraints
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max-budget"
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Max Budget
                </label>
                <input
                  id="max-budget"
                  type="number"
                  min={0}
                  step={100}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="e.g., 15000"
                  className="input w-full text-sm bg-[var(--bg-primary)] border-[var(--border)] rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="dietary"
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  <Leaf className="w-3.5 h-3.5" />
                  Dietary Restrictions
                </label>
                <input
                  id="dietary"
                  type="text"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  placeholder="e.g., 10 vegan, 5 gluten-free"
                  className="input w-full text-sm bg-[var(--bg-primary)] border-[var(--border)] rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4A373] to-[#b8844f] text-[#0B1120] hover:from-[#e0b589] hover:to-[#c99260] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#D4A373]/20 disabled:shadow-none"
          >
            <Sparkles className="w-4 h-4" />
            Generate Event Plan
          </button>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[10px] font-mono">Cmd+Enter</kbd> to submit
          </p>
        </div>
      </div>
    </div>
  );
}
