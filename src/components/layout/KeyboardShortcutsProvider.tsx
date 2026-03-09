"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShortcutsHelpModal } from "./ShortcutsHelpModal";

export function KeyboardShortcutsProvider() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  // Two-key sequence state
  const pendingPrefixRef = useRef<string | null>(null);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPrefix = useCallback(() => {
    pendingPrefixRef.current = null;
    if (prefixTimerRef.current) {
      clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd+K always works, even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Let CommandPalette handle Cmd+K — don't interfere
        return;
      }

      // Don't trigger other shortcuts when typing in inputs
      if (isInput) return;

      // "/" to open search — dispatch a synthetic Cmd+K
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        clearPrefix();
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
        return;
      }

      // "?" to toggle shortcuts help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        clearPrefix();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape to close modals
      if (e.key === "Escape") {
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
        }
        clearPrefix();
        return;
      }

      const key = e.key.toLowerCase();

      // If we have a pending prefix, handle the second key
      if (pendingPrefixRef.current) {
        const prefix = pendingPrefixRef.current;
        clearPrefix();

        if (prefix === "g") {
          const navMap: Record<string, string> = {
            d: "/dashboard",
            e: "/events",
            c: "/clients",
            r: "/recipes",
            s: "/staff",
            p: "/reports",
            t: "/templates",
          };
          const route = navMap[key];
          if (route) {
            e.preventDefault();
            router.push(route);
            return;
          }
        }

        if (prefix === "n") {
          const actionMap: Record<string, string> = {
            e: "/events/new",
            c: "/clients?new=true",
          };
          const route = actionMap[key];
          if (route) {
            e.preventDefault();
            router.push(route);
            return;
          }
        }
        return;
      }

      // Start a two-key sequence
      if (key === "g" || key === "n") {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          pendingPrefixRef.current = key;
          prefixTimerRef.current = setTimeout(() => {
            pendingPrefixRef.current = null;
          }, 500);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPrefix();
    };
  }, [router, showHelp, clearPrefix]);

  return showHelp ? (
    <ShortcutsHelpModal onClose={() => setShowHelp(false)} />
  ) : null;
}
