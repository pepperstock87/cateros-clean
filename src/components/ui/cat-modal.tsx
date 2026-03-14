"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showClose?: boolean;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function CatModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
  showClose = true,
}: CatModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl animate-in fade-in zoom-in-95 duration-200",
          SIZES[size],
          className
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-5 pb-0">
            <div>
              {title && (
                <h2 className="text-lg font-semibold font-display">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors -mt-1 -mr-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface CatModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CatModalFooter({ children, className }: CatModalFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[var(--border)]", className)}>
      {children}
    </div>
  );
}
