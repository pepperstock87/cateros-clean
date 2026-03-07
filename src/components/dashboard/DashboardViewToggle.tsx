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
    <div className="flex items-center gap-1 bg-[#1a1714] border border-[#2e271f] rounded-lg p-1">
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeView === key
              ? "bg-brand-600 text-white shadow-sm"
              : "text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#2e271f]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
