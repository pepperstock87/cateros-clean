"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";

export type EventFilterState = {
  search: string;
  status: string;
  dateRange: string;
};

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "proposed", label: "Proposed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const DATE_RANGES = [
  { value: "all", label: "All Dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
];

type Props = {
  onFilterChange: (filters: EventFilterState) => void;
  initialSearch?: string;
};

export function EventFilters({ onFilterChange, initialSearch = "" }: Props) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const filtersRef = useRef({ search, status, dateRange });

  // Emit filter changes (non-search) immediately
  const emitFilters = useCallback(
    (newStatus: string, newDateRange: string, newSearch: string) => {
      filtersRef.current = { search: newSearch, status: newStatus, dateRange: newDateRange };
      onFilterChange({ search: newSearch, status: newStatus, dateRange: newDateRange });
    },
    [onFilterChange]
  );

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      emitFilters(filtersRef.current.status, filtersRef.current.dateRange, search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, emitFilters]);

  // Sync initialSearch changes (e.g. from URL params)
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    emitFilters(value, dateRange, search);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    emitFilters(status, value, search);
  };

  const selectClass =
    "appearance-none bg-[#1a1714] border border-[#2e271f] rounded-lg text-sm text-[#f5ede0] pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5a4a]" />
        <input
          type="text"
          placeholder="Search events or clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 w-full"
        />
      </div>

      {/* Status filter */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={selectClass}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a] pointer-events-none" />
      </div>

      {/* Date range filter */}
      <div className="relative">
        <select
          value={dateRange}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className={selectClass}
        >
          {DATE_RANGES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b5a4a] pointer-events-none" />
      </div>
    </div>
  );
}
