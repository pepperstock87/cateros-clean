"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Shield, Search, ChevronDown, ChevronRight, Filter } from "lucide-react";
import type { AuditLogEntry } from "@/types";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-900/40 text-green-400 border-green-800/50",
  update: "bg-blue-900/40 text-blue-400 border-blue-800/50",
  delete: "bg-red-900/40 text-red-400 border-red-800/50",
  clone: "bg-purple-900/40 text-purple-400 border-purple-800/50",
  generate_production: "bg-amber-900/40 text-amber-400 border-amber-800/50",
  send_proposal: "bg-cyan-900/40 text-cyan-400 border-cyan-800/50",
  approve: "bg-green-900/40 text-green-400 border-green-800/50",
  sign: "bg-green-900/40 text-green-400 border-green-800/50",
  decline: "bg-red-900/40 text-red-400 border-red-800/50",
  payment_received: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
  status_change: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
  import: "bg-indigo-900/40 text-indigo-400 border-indigo-800/50",
  export: "bg-indigo-900/40 text-indigo-400 border-indigo-800/50",
};

const ENTITY_ROUTES: Record<string, string> = {
  event: "/events",
  client: "/clients",
  recipe: "/recipes",
  staff: "/staff",
  proposal: "/proposals",
  production: "/events",
};

const ALL_ENTITY_TYPES = ["event", "client", "recipe", "staff", "proposal", "payment", "template", "production"];
const ALL_ACTION_TYPES = ["create", "update", "delete", "clone", "generate_production", "send_proposal", "approve", "sign", "decline", "payment_received", "status_change", "import", "export"];

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

const PAGE_SIZE = 50;

export function AuditClient({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = entries;
    if (entityFilter !== "all") {
      result = result.filter((e) => e.entity_type === entityFilter);
    }
    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.entity_name && e.entity_name.toLowerCase().includes(q)) ||
          e.action.toLowerCase().includes(q) ||
          e.entity_type.toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, entityFilter, actionFilter, search]);

  const visible = filtered.slice(0, showCount);
  const hasMore = showCount < filtered.length;

  function entityLink(entry: AuditLogEntry): string | null {
    const base = ENTITY_ROUTES[entry.entity_type];
    if (!base) return null;
    if (entry.entity_type === "production") {
      return `${base}/${entry.entity_id}`;
    }
    return `${base}/${entry.entity_id}`;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-950 border border-brand-800/60 flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">Audit Log</h1>
          <p className="text-sm text-[#D4A373]">Track all changes across your account</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8BA8]" />
            <input
              type="text"
              placeholder="Search by name, action, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-sm text-[#F4F1ED] placeholder:text-[#7A8BA8] focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
              showFilters || entityFilter !== "all" || actionFilter !== "all"
                ? "bg-brand-950 border-brand-800/60 text-brand-300"
                : "border-[#2A3A5C] text-[#D4A373] hover:bg-[#1A2538]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-[#2A3A5C]">
            <div>
              <label className="block text-xs text-[#7A8BA8] mb-1">Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-[#0C1220] border border-[#2A3A5C] rounded-lg px-3 py-1.5 text-sm text-[#F4F1ED] focus:outline-none focus:border-brand-500"
              >
                <option value="all">All entities</option>
                {ALL_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#7A8BA8] mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-[#0C1220] border border-[#2A3A5C] rounded-lg px-3 py-1.5 text-sm text-[#F4F1ED] focus:outline-none focus:border-brand-500"
              >
                <option value="all">All actions</option>
                {ALL_ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {formatAction(a)}
                  </option>
                ))}
              </select>
            </div>
            {(entityFilter !== "all" || actionFilter !== "all") && (
              <button
                onClick={() => {
                  setEntityFilter("all");
                  setActionFilter("all");
                }}
                className="self-end px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-[#7A8BA8] mb-3">
        {filtered.length === 0
          ? "No entries found"
          : `Showing ${Math.min(showCount, filtered.length)} of ${filtered.length} entries`}
      </div>

      {/* Table */}
      {visible.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A3A5C] text-[#7A8BA8] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const link = entityLink(entry);
                  const isExpanded = expandedId === entry.id;
                  const hasDetails = entry.details && Object.keys(entry.details).length > 0;

                  return (
                    <tr key={entry.id} className="border-b border-[#2A3A5C]/50 last:border-0">
                      <td className="px-4 py-3 text-[#D4A373] whitespace-nowrap">
                        <span title={new Date(entry.created_at).toLocaleString()} suppressHydrationWarning>
                          {relativeTime(entry.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${
                            ACTION_COLORS[entry.action] || "bg-[#1A2538] text-[#D4A373] border-[#2A3A5C]"
                          }`}
                        >
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#D4A373] capitalize">{entry.entity_type}</td>
                      <td className="px-4 py-3">
                        {entry.entity_name ? (
                          link ? (
                            <Link
                              href={link}
                              className="text-brand-400 hover:text-brand-300 transition-colors hover:underline"
                            >
                              {entry.entity_name}
                            </Link>
                          ) : (
                            <span className="text-[#F4F1ED]">{entry.entity_name}</span>
                          )
                        ) : (
                          <span className="text-[#7A8BA8] italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasDetails && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="p-1 rounded hover:bg-[#1A2538] text-[#7A8BA8] hover:text-[#F4F1ED] transition-colors"
                            title="Toggle details"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded details rendered outside table for proper layout */}
          {visible.map((entry) => {
            if (expandedId !== entry.id || !entry.details || Object.keys(entry.details).length === 0) return null;
            return (
              <div key={`detail-${entry.id}`} className="px-4 py-3 bg-[#0C1220] border-t border-[#2A3A5C]/50">
                <div className="text-xs text-[#7A8BA8] mb-1 font-medium">Details</div>
                <pre className="text-xs text-[#D4A373] whitespace-pre-wrap font-mono bg-[#0A0F1A] rounded-lg p-3 border border-[#2A3A5C]/50">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Shield className="w-10 h-10 text-[#7A8BA8] mx-auto mb-3" />
          <h3 className="font-medium text-sm mb-1">No audit entries yet</h3>
          <p className="text-sm text-[#D4A373]">
            Actions like creating events, updating clients, and generating production sheets will appear here.
          </p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowCount((c) => c + PAGE_SIZE)}
            className="px-4 py-2 text-sm text-brand-400 hover:text-brand-300 border border-[#2A3A5C] rounded-lg hover:bg-[#1A2538] transition-colors"
          >
            Load more ({filtered.length - showCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
