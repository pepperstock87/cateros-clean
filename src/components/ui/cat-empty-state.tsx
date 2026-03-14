import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CatEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function CatEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: CatEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-brand-400" />
      </div>
      <h3 className="text-base font-semibold font-display mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Link
              href={action.href}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="btn-secondary px-5 py-2.5 text-sm"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
