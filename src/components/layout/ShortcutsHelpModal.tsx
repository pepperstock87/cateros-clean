"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  label: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["g", "d"], description: "Go to Dashboard" },
      { keys: ["g", "e"], description: "Go to Events" },
      { keys: ["g", "c"], description: "Go to Clients" },
      { keys: ["g", "r"], description: "Go to Recipes" },
      { keys: ["g", "s"], description: "Go to Staff" },
      { keys: ["g", "p"], description: "Go to Reports" },
      { keys: ["g", "t"], description: "Go to Templates" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["n", "e"], description: "New Event" },
      { keys: ["n", "c"], description: "New Client" },
    ],
  },
  {
    label: "General",
    shortcuts: [
      { keys: ["/"], description: "Open Search" },
      { keys: ["\u2318", "K"], description: "Open Search" },
      { keys: ["?"], description: "Show Keyboard Shortcuts" },
      { keys: ["Esc"], description: "Close Modal" },
    ],
  },
];

export function ShortcutsHelpModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-4 bg-[#0C1220] border border-[#2A3A5C] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3A5C]">
          <h2 className="text-sm font-semibold text-[#F4F1ED]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#7A8BA8] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.label}>
              <h3 className="text-[10px] uppercase tracking-wider font-medium text-[#7A8BA8] mb-2">
                {category.label}
              </h3>
              <div className="space-y-1.5">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-[#F4F1ED]">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-[#7A8BA8] text-[10px]">
                              then
                            </span>
                          )}
                          <kbd className="min-w-[24px] text-center px-1.5 py-0.5 rounded bg-[#1A2538] border border-[#2A3A5C] text-[11px] font-mono text-[#D4A373]">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2A3A5C]">
          <p className="text-[10px] text-[#7A8BA8] text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-[#1A2538] border border-[#2A3A5C] text-[10px] font-mono text-[#D4A373]">?</kbd> to toggle this modal
          </p>
        </div>
      </div>
    </div>
  );
}
