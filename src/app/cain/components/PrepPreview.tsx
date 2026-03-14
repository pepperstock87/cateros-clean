"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChefHat } from "lucide-react";
import type { CainPrepPreview, CainPrepItem } from "@/lib/cain/types";

interface PrepPreviewProps {
  prepPreview: CainPrepPreview;
}

const STATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  butchery: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/30" },
  garde_manger: { bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/30" },
  prep_kitchen: { bg: "bg-[#D4A373]/10", text: "text-[#D4A373]", border: "border-[#D4A373]/30" },
  hot_line: { bg: "bg-orange-400/10", text: "text-orange-400", border: "border-orange-400/30" },
  pastry: { bg: "bg-pink-400/10", text: "text-pink-400", border: "border-pink-400/30" },
  beverage: { bg: "bg-cyan-400/10", text: "text-cyan-400", border: "border-cyan-400/30" },
  packing: { bg: "bg-gray-400/10", text: "text-gray-400", border: "border-gray-400/30" },
};

function getStationStyle(station: string) {
  return STATION_COLORS[station] || STATION_COLORS.prep_kitchen;
}

function formatStation(station: string) {
  return station.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PrepPreview({ prepPreview }: PrepPreviewProps) {
  const [view, setView] = useState<"station" | "dish">("station");
  const { byStation, byDish, totalTasks, stationCounts } = prepPreview;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-[#D4A373]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Prep Breakdown
          </h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#D4A373]/15 text-[#D4A373]">
            {totalTasks} tasks
          </span>
        </div>
        <div className="flex items-center rounded-lg border border-[var(--border)] text-[10px] overflow-hidden">
          <button
            onClick={() => setView("station")}
            className={`px-2.5 py-1 transition-colors ${view === "station" ? "bg-[#D4A373]/15 text-[#D4A373]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            By Station
          </button>
          <button
            onClick={() => setView("dish")}
            className={`px-2.5 py-1 transition-colors ${view === "dish" ? "bg-[#D4A373]/15 text-[#D4A373]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            By Dish
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-[var(--border)]/50">
        {view === "station"
          ? Object.entries(byStation).map(([station, items]) => (
              <StationSection key={station} station={station} items={items} />
            ))
          : byDish.map((dish) => (
              <DishSection key={dish.dishName} dish={dish} />
            ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border)] flex items-center gap-3 flex-wrap text-[10px] text-[var(--text-muted)]">
        {Object.entries(stationCounts).map(([station, count]) => {
          const style = getStationStyle(station);
          return (
            <span key={station} className={`${style.text}`}>
              {formatStation(station)}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Station Section ----------

function StationSection({
  station,
  items,
}: {
  station: string;
  items: CainPrepItem[];
}) {
  const [open, setOpen] = useState(true);
  const style = getStationStyle(station);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--bg-primary)]/50`}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        )}
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${style.bg} ${style.text} border ${style.border}`}>
          {formatStation(station)}
        </span>
        <span className="text-[var(--text-muted)] ml-auto text-[10px]">
          {items.length} task{items.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-2">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-[var(--border)]/30">
              {items.map((item, i) => (
                <tr key={`${item.componentName}-${i}`}>
                  <td className="py-1.5 pr-2 text-[var(--text-primary)]">
                    {item.componentName}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)] w-24">
                    {item.quantity.toFixed(1)} {item.unit}
                  </td>
                  <td className="py-1.5 text-right text-[var(--text-muted)] text-[10px] w-32 truncate">
                    {item.menuItemName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Dish Section ----------

function DishSection({
  dish,
}: {
  dish: {
    dishName: string;
    category: string;
    scaleFactor: number;
    items: CainPrepItem[];
  };
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className="text-[var(--text-primary)]">{dish.dishName}</span>
        <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)]">
          {dish.category}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
          {dish.scaleFactor}x scale · {dish.items.length} items
        </span>
      </button>

      {open && (
        <div className="px-4 pb-2">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-[var(--border)]/30">
              {dish.items.map((item, i) => {
                const style = getStationStyle(item.station || "prep_kitchen");
                return (
                  <tr key={`${item.componentName}-${i}`}>
                    <td className="py-1.5 pr-2 text-[var(--text-primary)]">
                      {item.componentName}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-[var(--text-secondary)] w-24">
                      {item.quantity.toFixed(1)} {item.unit}
                    </td>
                    <td className="py-1.5 text-right w-28">
                      <span className={`text-[10px] ${style.text}`}>
                        {formatStation(item.station || "prep_kitchen")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
