"use client";

import { useState } from "react";
import { switchOrganizationAction } from "@/lib/actions/organizations";
import { ChevronDown, Building2, Loader2, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrgSwitcherProps = {
  currentOrg: { id: string; name: string; slug: string };
  allOrgs: Array<{ id: string; name: string }>;
};

export function OrgSwitcher({ currentOrg, allOrgs }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);
  const router = useRouter();
  const hasMultiple = allOrgs.length > 1;

  async function handleSwitch(orgId: string) {
    if (orgId === currentOrg.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setSwitchingToId(orgId);
    try {
      const result = await switchOrganizationAction(orgId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Switched organization");
        router.refresh();
      }
    } catch {
      toast.error("Failed to switch organization");
    } finally {
      setSwitching(false);
      setSwitchingToId(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer"
      >
        <div className="w-6 h-6 rounded-md bg-brand-950 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
          {switching ? (
            <Loader2 className="w-3 h-3 text-brand-400 animate-spin" />
          ) : (
            <Building2 className="w-3 h-3 text-brand-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-[var(--text-primary)] truncate block">
            {currentOrg.name}
          </span>
          {allOrgs.length > 1 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {allOrgs.length} organization{allOrgs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl overflow-hidden">
            {/* Org list */}
            {allOrgs.map((org) => {
              const isCurrent = org.id === currentOrg.id;
              const isSwitchingTo = switchingToId === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={switching}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors ${
                    isCurrent
                      ? "bg-brand-950/50 text-brand-300"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  } disabled:opacity-50`}
                >
                  <div className="w-5 h-5 rounded-md bg-brand-950/50 border border-brand-800/30 flex items-center justify-center flex-shrink-0">
                    {isSwitchingTo ? (
                      <Loader2 className="w-2.5 h-2.5 text-brand-400 animate-spin" />
                    ) : (
                      <Building2 className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <span className="truncate flex-1">{org.name}</span>
                  {isCurrent && (
                    <Check className="w-3 h-3 text-brand-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Create New Organization */}
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--text-muted)] hover:text-brand-400 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="w-5 h-5 rounded-md border border-dashed border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <Plus className="w-2.5 h-2.5" />
              </div>
              <span>Create New Organization</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
