"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, LayoutDashboard, CalendarDays, BookOpen, FileText, CreditCard, LogOut, Settings, Calendar, Menu, X, Palette, Sparkles, Receipt, Users, Package, ShoppingCart, Contact } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationBell } from "@/components/layout/NotificationBell";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/clients", icon: Contact, label: "Clients" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/recipes", icon: BookOpen, label: "Recipe Library" },
  { href: "/staff", icon: Users, label: "Staff" },
  { href: "/rentals", icon: Package, label: "Rentals" },
  { href: "/branding", icon: Palette, label: "Branding" },
  { href: "/proposals", icon: FileText, label: "Proposals" },
  { href: "/spending", icon: Receipt, label: "Spending" },
  { href: "/shopping", icon: ShoppingCart, label: "Shopping List" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/assistant", icon: Sparkles, label: "AI Assistant" },
];

export function Sidebar({ companyName }: { companyName?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      // Upcoming events (confirmed or proposed, event_date >= today)
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .in("status", ["confirmed", "proposed"])
        .gte("event_date", new Date().toISOString().split("T")[0]),
      // Pending proposals (status = sent)
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      // Unconfirmed staff assignments
      supabase
        .from("event_staff_assignments")
        .select("id", { count: "exact", head: true })
        .eq("confirmed", false),
    ]).then(([eventsRes, proposalsRes, staffRes]) => {
      const newBadges: Record<string, number> = {};
      if (eventsRes.count) newBadges["/events"] = eventsRes.count;
      if (proposalsRes.count) newBadges["/proposals"] = proposalsRes.count;
      if (staffRes.count) newBadges["/staff"] = staffRes.count;
      setBadges(newBadges);
    });
  }, []);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0f0d0b] border-b border-[#2e271f] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-sm font-semibold">Cateros</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 hover:bg-[#1c1814] rounded-lg transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 z-40 md:z-0 w-56 h-screen bg-[#0f0d0b] border-r border-[#2e271f] flex flex-col transition-transform md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Desktop Header */}
        <div className="hidden md:block px-5 py-5 border-b border-[#2e271f]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold leading-tight">Cateros</div>
              {companyName && <div className="text-xs text-[#6b5a4a] truncate leading-tight mt-0.5">{companyName}</div>}
            </div>
          </Link>
        </div>

        {/* Mobile Padding for fixed header */}
        <div className="md:hidden h-14" />

        {/* Search */}
        <div className="px-3 pt-3">
          <CommandPalette />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active ? "bg-brand-950 text-brand-300 border border-brand-800/60" : "text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#1c1814]"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-brand-400" : "")} />
                {label}
                {badges[href] && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 min-w-[20px] text-center">
                    {badges[href]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-3 border-t border-[#2e271f] space-y-0.5">
          <NotificationBell />
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#9c8876] hover:text-[#f5ede0] hover:bg-[#1c1814] transition-all"
          >
            <Settings className="w-4 h-4" />Settings
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#9c8876] hover:text-red-400 hover:bg-red-900/20 transition-all">
              <LogOut className="w-4 h-4" />Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Spacer for mobile fixed header */}
      <div className="md:hidden h-14" />
    </>
  );
}
