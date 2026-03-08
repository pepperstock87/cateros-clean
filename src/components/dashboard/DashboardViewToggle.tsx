"use client";

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Upcoming" },
] as const;

interface DashboardViewToggleProps {
  activeView: string;
  onChange: (view: string) => void;
}

export function DashboardViewToggle({ activeView, onChange }: DashboardViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[#182030] border border-[#2A3A5C] rounded-lg p-1">
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeView === key
              ? "bg-brand-600 text-white shadow-sm"
              : "text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#2A3A5C]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
