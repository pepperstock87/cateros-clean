"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "cateros-theme";

type ThemePreference = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system" ? getSystemTheme() : preference;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_KEY) as ThemePreference | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreference(stored);
      }
    } catch {}
  }, []);

  // Listen for system preference changes when in "system" mode
  const handleSystemChange = useCallback(() => {
    if (preference === "system") {
      applyTheme("system");
    }
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", handleSystemChange);
    return () => mq.removeEventListener("change", handleSystemChange);
  }, [handleSystemChange]);

  function cycle() {
    // Cycle: dark → light → system → dark
    const order: ThemePreference[] = ["dark", "light", "system"];
    const idx = order.indexOf(preference);
    const next = order[(idx + 1) % order.length];
    setPreference(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  if (!mounted) return null;

  const resolved = preference === "system" ? getSystemTheme() : preference;
  const label =
    preference === "system"
      ? "System theme"
      : preference === "dark"
        ? "Light mode"
        : "Dark mode";
  const Icon =
    preference === "system"
      ? Monitor
      : resolved === "dark"
        ? Sun
        : Moon;

  return (
    <button
      onClick={cycle}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={cn(
        "flex items-center rounded-lg text-sm transition-all duration-150",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5 w-full"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && (
        preference === "system"
          ? "System"
          : preference === "dark"
            ? "Light mode"
            : "Dark mode"
      )}
    </button>
  );
}
