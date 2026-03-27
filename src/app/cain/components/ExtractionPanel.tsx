"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import type { ExtractedEntities, ExtractedEntity } from "@/lib/cain/types";
import { EntityChip } from "./EntityChip";

interface ExtractionPanelProps {
  entities: ExtractedEntities;
  onClose: () => void;
  onCorrectEntity: (
    category: string,
    key: string,
    newValue: string
  ) => void;
}

// Count total non-empty entities for the badge
export function countEntities(entities: ExtractedEntities): number {
  let count = 0;
  count += Object.keys(entities.event).length;
  count += Object.keys(entities.client).length;
  count += entities.menu.length;
  count += entities.staffing.length;
  count += entities.rentals.length;
  count += entities.timeline.length;
  if (entities.budget) count++;
  if (entities.serviceStyle) count++;
  return count;
}

export function ExtractionPanel({
  entities,
  onClose,
  onCorrectEntity,
}: ExtractionPanelProps) {
  return (
    <div className="w-80 shrink-0 border-l border-[var(--border)] bg-[var(--bg-primary)] flex flex-col h-full max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:w-full max-lg:h-[50vh] max-lg:border-l-0 max-lg:border-t max-lg:rounded-t-2xl max-lg:z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Extracted Details
          </h2>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#D4A373]/15 text-[#D4A373]">
            {countEntities(entities)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-secondary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Confidence legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Confirmed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Inferred
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Assumed
        </span>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        <RecordSection
          title="Event Details"
          record={entities.event}
          category="event"
          onCorrect={onCorrectEntity}
        />
        <RecordSection
          title="Client"
          record={entities.client}
          category="client"
          onCorrect={onCorrectEntity}
        />
        {entities.serviceStyle && (
          <SingleEntitySection
            title="Service Style"
            entity={entities.serviceStyle}
            category="serviceStyle"
            onCorrect={onCorrectEntity}
          />
        )}
        {entities.budget && (
          <SingleEntitySection
            title="Budget"
            entity={entities.budget}
            category="budget"
            onCorrect={onCorrectEntity}
          />
        )}
        <ArraySection
          title="Menu"
          items={entities.menu}
          category="menu"
          onCorrect={onCorrectEntity}
        />
        <ArraySection
          title="Staffing"
          items={entities.staffing}
          category="staffing"
          onCorrect={onCorrectEntity}
        />
        <ArraySection
          title="Rentals"
          items={entities.rentals}
          category="rentals"
          onCorrect={onCorrectEntity}
        />
        <ArraySection
          title="Timeline"
          items={entities.timeline}
          category="timeline"
          onCorrect={onCorrectEntity}
        />
      </div>
    </div>
  );
}

// ---------- Section Components ----------

function RecordSection({
  title,
  record,
  category,
  onCorrect,
}: {
  title: string;
  record: Record<string, ExtractedEntity>;
  category: string;
  onCorrect: (category: string, key: string, value: string) => void;
}) {
  const entries = Object.values(record);
  const [open, setOpen] = useState(entries.length > 0);

  return (
    <div className="border-b border-[var(--border)]/50 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {title}
        {entries.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] ml-auto">
            {entries.length}
          </span>
        )}
      </button>
      {open && entries.length > 0 && (
        <div className="pl-2">
          {entries.map((entity, idx) => (
            <EntityChip
              key={`${entity.key ?? idx}`}
              label={entity.key ?? "unknown"}
              value={entity.value}
              confidence={entity.confidence}
              onEdit={(newValue) => onCorrect(category, entity.key, newValue)}
            />
          ))}
        </div>
      )}
      {open && entries.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] italic pl-5 py-1">
          Not yet discussed
        </p>
      )}
    </div>
  );
}

function ArraySection({
  title,
  items,
  category,
  onCorrect,
}: {
  title: string;
  items: ExtractedEntity[];
  category: string;
  onCorrect: (category: string, key: string, value: string) => void;
}) {
  const [open, setOpen] = useState(items.length > 0);

  return (
    <div className="border-b border-[var(--border)]/50 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {title}
        {items.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] ml-auto">
            {items.length}
          </span>
        )}
      </button>
      {open && items.length > 0 && (
        <div className="pl-2">
          {items.map((entity, idx) => (
            <EntityChip
              key={`${entity.key}-${idx}`}
              label={entity.key}
              value={entity.value}
              confidence={entity.confidence}
              onEdit={(newValue) => onCorrect(category, entity.key, newValue)}
            />
          ))}
        </div>
      )}
      {open && items.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] italic pl-5 py-1">
          Not yet discussed
        </p>
      )}
    </div>
  );
}

function SingleEntitySection({
  title,
  entity,
  category,
  onCorrect,
}: {
  title: string;
  entity: ExtractedEntity;
  category: string;
  onCorrect: (category: string, key: string, value: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)]/50 pb-2">
      <div className="pl-2">
        <EntityChip
          label={title}
          value={entity.value}
          confidence={entity.confidence}
          onEdit={(newValue) => onCorrect(category, entity.key, newValue)}
        />
      </div>
    </div>
  );
}
