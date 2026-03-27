"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { safeParseDate } from "@/lib/utils";
import {
  LayoutTemplate,
  Search,
  Trash2,
  Loader2,
  Play,
  Eye,
  X,
  Plus,
  UtensilsCrossed,
  DollarSign,
  Package,
  Clock,
  Layers,
  Tag,
} from "lucide-react";
import { deleteTemplate, applyTemplateToEvent, fetchUserEvents } from "@/lib/actions/templates";
import { toast } from "sonner";
import type { EventTemplate, TemplateCategory } from "@/types";
import { CreateTemplateModal } from "./CreateTemplateModal";

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: typeof UtensilsCrossed; color: string; bg: string; border: string }> = {
  menu: { label: "Menu", icon: UtensilsCrossed, color: "text-emerald-300", bg: "bg-emerald-900/30", border: "border-emerald-700/50" },
  pricing: { label: "Pricing", icon: DollarSign, color: "text-blue-300", bg: "bg-blue-900/30", border: "border-blue-700/50" },
  pack_list: { label: "Pack List", icon: Package, color: "text-orange-300", bg: "bg-orange-900/30", border: "border-orange-700/50" },
  timeline: { label: "Timeline", icon: Clock, color: "text-purple-300", bg: "bg-purple-900/30", border: "border-purple-700/50" },
  full_event: { label: "Full Event", icon: Layers, color: "text-pink-300", bg: "bg-pink-900/30", border: "border-pink-700/50" },
};

const TABS: { key: TemplateCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "menu", label: "Menu" },
  { key: "pricing", label: "Pricing" },
  { key: "pack_list", label: "Pack List" },
  { key: "timeline", label: "Timeline" },
  { key: "full_event", label: "Full Event" },
];

type Props = {
  templates: EventTemplate[];
};

export function TemplatesClient({ templates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TemplateCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EventTemplate | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string; event_date: string; client_name: string }>>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    let result = templates;
    if (activeTab !== "all") {
      result = result.filter((t) => t.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [templates, activeTab, search]);

  const grouped = useMemo(() => {
    const map = new Map<TemplateCategory, EventTemplate[]>();
    for (const t of filtered) {
      const cat = t.category as TemplateCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return map;
  }, [filtered]);

  async function loadEvents() {
    if (eventsLoaded) return;
    const data = await fetchUserEvents();
    setEvents(data);
    setEventsLoaded(true);
  }

  async function handleApply(templateId: string, eventId: string) {
    setApplyingId(templateId);
    const result = await applyTemplateToEvent(templateId, eventId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Template applied to event");
      startTransition(() => router.refresh());
    }
    setApplyingId(null);
    setShowEventPicker(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteTemplate(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Template deleted");
      startTransition(() => router.refresh());
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8BA8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="input pl-10 w-full text-sm"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? templates.length
              : templates.filter((t) => t.category === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-[#D4A373] text-[#0C1220]"
                  : "bg-[#1A2538] text-[#D4A373] hover:bg-[#223050] border border-[#2A3A5C]"
              }`}
            >
              {tab.label}
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <LayoutTemplate className="w-10 h-10 text-[#7A8BA8] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">
            {search ? "No templates match your search" : "No templates yet"}
          </h2>
          <p className="text-sm text-[#D4A373] mb-4">
            {search
              ? "Try a different search term or category filter."
              : "Save templates from your events or create one manually."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const catConfig = CATEGORY_CONFIG[template.category as TemplateCategory] ?? CATEGORY_CONFIG.menu;
            const CatIcon = catConfig.icon;

            return (
              <div
                key={template.id}
                className="card p-5 flex flex-col justify-between gap-4 hover:border-[#344570] transition-colors"
              >
                <div>
                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {catConfig.label}
                    </span>
                    <span className="text-[10px] text-[#7A8BA8]" suppressHydrationWarning>
                      {formatDate(template.created_at)}
                    </span>
                  </div>

                  {/* Name and description */}
                  <h3 className="font-medium text-[#F4F1ED] mb-1 truncate">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-[#D4A373] leading-snug line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#1A2538] text-[#7A8BA8] border border-[#2A3A5C]"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#2A3A5C]">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="btn-secondary text-xs px-2.5 py-1.5 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={async () => {
                      await loadEvents();
                      setShowEventPicker(template.id);
                    }}
                    disabled={applyingId === template.id}
                    className="btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 flex-1 justify-center"
                  >
                    {applyingId === template.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Apply
                  </button>
                  {confirmDeleteId === template.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={deletingId === template.id}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/50"
                      >
                        {deletingId === template.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Yes"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 text-[#7A8BA8] hover:text-[#F4F1ED]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(template.id)}
                      className="p-1.5 rounded-lg text-[#7A8BA8] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Event picker dropdown */}
                {showEventPicker === template.id && (
                  <div className="mt-2 p-3 rounded-lg bg-[#0C1220] border border-[#2A3A5C]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#D4A373]">Apply to which event?</span>
                      <button onClick={() => setShowEventPicker(null)} className="text-[#7A8BA8] hover:text-[#F4F1ED]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {events.length === 0 ? (
                      <p className="text-xs text-[#7A8BA8]">No events found.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {events.map((evt) => (
                          <button
                            key={evt.id}
                            onClick={() => handleApply(template.id, evt.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-[#1A2538] transition-colors"
                          >
                            <span className="text-[#F4F1ED]">{evt.name}</span>
                            <span className="text-[#7A8BA8] ml-2">
                              {evt.client_name} - {safeParseDate(evt.event_date).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewTemplate(null)}>
          <div
            className="bg-[#0C1220] border border-[#2A3A5C] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{previewTemplate.name}</h2>
                {previewTemplate.description && (
                  <p className="text-sm text-[#D4A373] mt-1">{previewTemplate.description}</p>
                )}
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-[#1A2538] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              {(() => {
                const catConfig = CATEGORY_CONFIG[previewTemplate.category as TemplateCategory];
                const CatIcon = catConfig?.icon ?? LayoutTemplate;
                return (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${catConfig?.bg ?? ""} ${catConfig?.color ?? ""} ${catConfig?.border ?? ""}`}>
                    <CatIcon className="w-3.5 h-3.5" />
                    {catConfig?.label ?? previewTemplate.category}
                  </span>
                );
              })()}
            </div>
            <div className="card p-4">
              <h3 className="text-xs font-medium text-[#7A8BA8] uppercase tracking-wider mb-3">Template Data</h3>
              <pre className="text-xs text-[#D4A373] whitespace-pre-wrap overflow-x-auto max-h-[400px]">
                {JSON.stringify(previewTemplate.template_data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <CreateTemplateModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
