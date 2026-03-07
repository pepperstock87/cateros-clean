"use client";

import { useState, useRef, useEffect } from "react";
import { Download } from "lucide-react";

type ExportButtonProps = {
  onExportCSV: () => void;
  onExportPDF?: () => void;
};

export function ExportButton({ onExportCSV, onExportPDF }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="btn-secondary text-xs flex items-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-lg border border-[#2e271f] bg-[#1a1714] shadow-xl py-1">
          <button
            onClick={() => {
              onExportCSV();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-[#f5ede0] hover:bg-[#2e271f] transition-colors"
          >
            Export CSV
          </button>
          {onExportPDF && (
            <button
              onClick={() => {
                onExportPDF();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-[#f5ede0] hover:bg-[#2e271f] transition-colors"
            >
              Export PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
