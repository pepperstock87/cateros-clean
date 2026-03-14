import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  proposed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sent: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  canceled: "bg-red-500/10 text-red-400 border-red-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_DOTS: Record<string, string> = {
  draft: "bg-slate-400",
  proposed: "bg-amber-400",
  sent: "bg-amber-400",
  confirmed: "bg-green-400",
  completed: "bg-brand-400",
  canceled: "bg-red-400",
  active: "bg-green-400",
  inactive: "bg-slate-400",
  pending: "bg-amber-400",
  accepted: "bg-green-400",
  declined: "bg-red-400",
  paid: "bg-green-400",
  overdue: "bg-red-400",
};

interface CatStatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  showDot?: boolean;
}

export function CatStatusBadge({
  status,
  label,
  size = "sm",
  className,
  showDot = true,
}: CatStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = STATUS_STYLES[normalized] || STATUS_STYLES.draft;
  const dotColor = STATUS_DOTS[normalized] || STATUS_DOTS.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium capitalize",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        style,
        className
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
      )}
      {label || status}
    </span>
  );
}
