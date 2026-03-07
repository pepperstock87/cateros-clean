"use client";

import { useState } from "react";
import { switchOrganizationAction } from "@/lib/actions/organizations";
import { ChevronDown, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type OrgSwitcherProps = {
  currentOrg: { id: string; name: string; slug: string };
  allOrgs: Array<{ id: string; name: string }>;
};

export function OrgSwitcher({ currentOrg, allOrgs }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const hasMultiple = allOrgs.length > 1;

  async function handleSwitch(orgId: string) {
    if (orgId === currentOrg.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
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
      setOpen(false);
    }
  }

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => hasMultiple && setOpen(!open)}
        disabled={switching}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
          hasMultiple
            ? "hover:bg-[#1c1814] cursor-pointer"
            : "cursor-default"
        }`}
      >
        <div className="w-6 h-6 rounded-md bg-brand-950 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
          {switching ? (
            <Loader2 className="w-3 h-3 text-brand-400 animate-spin" />
          ) : (
            <Building2 className="w-3 h-3 text-brand-400" />
          )}
        </div>
        <span className="text-xs font-medium text-[#f5ede0] truncate flex-1">
          {currentOrg.name}
        </span>
        {hasMultiple && (
          <ChevronDown className={`w-3 h-3 text-[#6b5a4a] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && hasMultiple && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-[#2e271f] bg-[#1a1714] shadow-xl overflow-hidden">
            {allOrgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  org.id === currentOrg.id
                    ? "bg-brand-950/50 text-brand-300"
                    : "text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#1c1814]"
                }`}
              >
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{org.name}</span>
                {org.id === currentOrg.id && (
                  <span className="ml-auto text-[10px] text-brand-400">Current</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
