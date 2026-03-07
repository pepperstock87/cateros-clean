"use client";

import { useState } from "react";
import { Target, Pencil, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  currentRevenue: number;
  defaultGoal?: number;
}

export function RevenueGoal({ currentRevenue, defaultGoal = 10000 }: Props) {
  const [goal, setGoal] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cateros_revenue_goal");
      return saved ? parseFloat(saved) : defaultGoal;
    }
    return defaultGoal;
  });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(goal.toString());

  const pct = goal > 0 ? Math.min((currentRevenue / goal) * 100, 100) : 0;
  const onTrack = pct >= (new Date().getDate() / 30) * 100;

  function handleSave() {
    const val = parseFloat(editValue) || defaultGoal;
    setGoal(val);
    localStorage.setItem("cateros_revenue_goal", val.toString());
    setEditing(false);
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-xs md:text-sm text-[#9c8876] uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4" />
          Monthly Goal
        </h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b5a4a]">$</span>
            <input
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="input text-xs w-24 py-1"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
            <button onClick={handleSave} className="text-green-400 hover:text-green-300">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setEditValue(goal.toString()); setEditing(true); }} className="flex items-center gap-1 text-xs text-[#6b5a4a] hover:text-[#9c8876] transition-colors">
            {formatCurrency(goal)} goal
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-lg md:text-xl font-semibold font-display">{formatCurrency(currentRevenue)}</span>
        <span className={`text-xs font-medium ${onTrack ? "text-green-400" : "text-yellow-400"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#2e271f] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-400" : onTrack ? "bg-brand-400" : "bg-yellow-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
