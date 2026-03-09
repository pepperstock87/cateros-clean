"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "cateros-theme";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_KEY) as "dark" | "light" | null;
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
      }
    } catch {}
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={collapsed ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : undefined}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "flex items-center rounded-lg text-sm transition-all duration-150",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5 w-full"
      )}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Moon className="w-4 h-4 flex-shrink-0" />
      )}
      {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
    </button>
  );
}
