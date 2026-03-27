"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

interface MoreActionsDropdownProps {
  children: ReactNode;
}

export function MoreActionsDropdown({ children }: MoreActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary flex items-center gap-2"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
        More actions
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-[#2A3A5C] bg-[#0F1729] shadow-xl py-1"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
