"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

type TabKey = "overview" | "pricing" | "payments" | "staff" | "vendors" | "activity";

type Props = {
  children: {
    overview: ReactNode;
    pricing: ReactNode;
    payments: ReactNode;
    staff: ReactNode;
    vendors: ReactNode;
    activity: ReactNode;
  };
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "pricing", label: "Pricing" },
  { key: "payments", label: "Payments" },
  { key: "staff", label: "Staff" },
  { key: "vendors", label: "Vendors" },
  { key: "activity", label: "Activity" },
];

function getHashTab(): TabKey | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace("#", "") as TabKey;
  return tabs.some((t) => t.key === hash) ? hash : null;
}

export function EventDetailTabs({ children }: Props) {
  const [active, setActive] = useState<TabKey>("overview");
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Restore tab from URL hash on mount
  useEffect(() => {
    const fromHash = getHashTab();
    if (fromHash) setActive(fromHash);

    const onHashChange = () => {
      const t = getHashTab();
      if (t) setActive(t);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const switchTab = (key: TabKey) => {
    setActive(key);
    window.location.hash = key;
  };

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={tabBarRef}
        className="sticky top-0 z-20 bg-[#110f0c] border-b border-[#2e271f] -mx-8 px-8 overflow-x-auto scrollbar-hide"
      >
        <nav className="flex gap-0 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => switchTab(tab.key)}
                className={`
                  relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150
                  ${
                    isActive
                      ? "text-brand-400"
                      : "text-[#9c8876] hover:text-[#f5ede0]"
                  }
                `}
              >
                {tab.label}
                {/* Active underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            className={
              active === tab.key
                ? "animate-in fade-in duration-200"
                : "hidden"
            }
          >
            {children[tab.key]}
          </div>
        ))}
      </div>
    </div>
  );
}
