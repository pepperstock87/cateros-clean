import { useEffect } from "react";

type Shortcut = {
  key: string;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          shiftMatch
        ) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export type { Shortcut };
