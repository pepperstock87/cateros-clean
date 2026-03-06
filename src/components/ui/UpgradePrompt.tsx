import Link from "next/link";
import { Zap, Lock } from "lucide-react";

interface UpgradePromptProps {
  title?: string;
  message: string;
  plan?: "basic" | "pro";
  inline?: boolean;
}

export function UpgradePrompt({ 
  title = "Upgrade Required", 
  message, 
  plan = "basic",
  inline = false 
}: UpgradePromptProps) {
  const planName = plan === "pro" ? "Pro" : "Basic";
  const planPrice = plan === "pro" ? "$149" : "$65";

  if (inline) {
    return (
      <div className="bg-brand-950 border border-brand-800 rounded-lg p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#f5ede0] mb-2">{message}</p>
          <Link href="/billing" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
            Upgrade to {planName} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-12 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-brand-950 border border-brand-800 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-brand-400" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-[#9c8876] mb-6">{message}</p>
      <Link href="/billing" className="btn-primary inline-flex items-center gap-2 px-6">
        <Zap className="w-4 h-4" />
        Upgrade to {planName} ({planPrice}/month)
      </Link>
    </div>
  );
}
