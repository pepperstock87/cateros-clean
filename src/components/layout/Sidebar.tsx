"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, LayoutDashboard, CalendarDays, BookOpen, FileText, CreditCard, LogOut, Settings, Calendar, Menu, X, Palette, Sparkles, Receipt, Users, Package, ShoppingCart, Contact, LayoutTemplate, BarChart3, MapPin, Store, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";

const SIDEBAR_COLLAPSED_KEY = "cateros-sidebar-collapsed";

const NAV: { href: string; icon: typeof LayoutDashboard; label: string; sub?: boolean }[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/clients", icon: Contact, label: "Clients" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/recipes", icon: BookOpen, label: "Recipe Library" },
  { href: "/recipes/analytics", icon: BarChart3, label: "Recipe Analytics", sub: true },
  { href: "/staff", icon: Users, label: "Staff" },
  { href: "/rentals", icon: Package, label: "Rentals" },
  { href: "/venues", icon: MapPin, label: "Venues" },
  { href: "/vendor-profile", icon: Store, label: "Vendor Profile" },
  { href: "/branding", icon: Palette, label: "Branding" },
  { href: "/proposals", icon: FileText, label: "Proposals" },
  { href: "/spending", icon: Receipt, label: "Spending" },
  { href: "/shopping", icon: ShoppingCart, label: "Shopping List" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/assistant", icon: Sparkles, label: "AI Assistant" },
  { href: "/team", icon: Users, label: "Team" },
];

export function Sidebar({ companyName }: { companyName?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [orgData, setOrgData] = useState<{
    currentOrg: { id: string; name: string; slug: string } | null;
    allOrgs: Array<{ id: string; name: string }>;
  }>({ currentOrg: null, allOrgs: [] });

  // Load collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();

    // Fetch org data for OrgSwitcher
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_organization_id) return;

      const [orgRes, membershipsRes] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug")
          .eq("id", profile.current_organization_id)
          .single(),
        supabase
          .from("organization_members")
          .select("organization_id, organizations(id, name)")
          .eq("user_id", user.id),
      ]);

      if (orgRes.data) {
        const allOrgs = (membershipsRes.data ?? [])
          .map((m: any) => m.organizations)
          .filter(Boolean)
          .map((o: any) => ({ id: o.id, name: o.name }));

        setOrgData({
          currentOrg: orgRes.data,
          allOrgs: allOrgs.length > 0 ? allOrgs : [{ id: orgRes.data.id, name: orgRes.data.name }],
        });
      }
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Fetch user profile to get current_organization_id for filtering
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", user.id)
        .single();

      const orgId = profile?.current_organization_id;

      let eventsQuery = supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .in("status", ["confirmed", "proposed"])
        .gte("event_date", new Date().toISOString().split("T")[0]);
      if (orgId) eventsQuery = eventsQuery.eq("organization_id", orgId);

      let proposalsQuery = supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent");
      if (orgId) proposalsQuery = proposalsQuery.eq("organization_id", orgId);

      let staffQuery = supabase
        .from("event_staff_assignments")
        .select("id", { count: "exact", head: true })
        .eq("confirmed", false);
      if (orgId) staffQuery = staffQuery.eq("organization_id", orgId);

      const [eventsRes, proposalsRes, staffRes] = await Promise.all([
        eventsQuery,
        proposalsQuery,
        staffQuery,
      ]);

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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0C1220] border-b border-[#2A3A5C] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-sm font-semibold">Cateros</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 hover:bg-[#1A2538] rounded-lg transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "no-print fixed md:sticky top-0 z-40 md:z-0 h-screen bg-[#0C1220] border-r border-[#2A3A5C] flex flex-col transition-all duration-200 md:translate-x-0",
        collapsed ? "md:w-16 w-56" : "w-56",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Desktop Header */}
        <div className="hidden md:block px-5 py-5 border-b border-[#2A3A5C]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold leading-tight">Cateros</div>
                {companyName && <div className="text-xs text-[#7A8BA8] truncate leading-tight mt-0.5">{companyName}</div>}
              </div>
            )}
          </Link>
        </div>

        {/* Mobile Padding for fixed header */}
        <div className="md:hidden h-14" />

        {/* Org Switcher */}
        {orgData.currentOrg && !collapsed && (
          <div className="border-b border-[#2A3A5C]">
            <OrgSwitcher currentOrg={orgData.currentOrg} allOrgs={orgData.allOrgs} />
          </div>
        )}

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <CommandPalette />
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 py-4 space-y-0.5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {NAV.map(({ href, icon: Icon, label, sub }) => {
            const active = sub ? pathname === href : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center rounded-lg font-medium transition-all duration-150",
                  collapsed
                    ? "justify-center px-0 py-2.5 text-sm"
                    : cn("gap-2.5", sub ? "pl-9 pr-3 py-1.5 text-xs" : "px-3 py-2.5 text-sm"),
                  active ? "bg-brand-950 text-brand-300 border border-brand-800/60" : "text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#1A2538]"
                )}
              >
                <Icon className={cn("flex-shrink-0", sub ? "w-3.5 h-3.5" : "w-4 h-4", active ? "text-brand-400" : "")} />
                {!collapsed && (
                  <>
                    {label}
                    {badges[href] && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 min-w-[20px] text-center">
                        {badges[href]}
                      </span>
                    )}
                  </>
                )}
                {collapsed && badges[href] && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-brand-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={cn("py-3 border-t border-[#2A3A5C] space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {!collapsed && <NotificationBell />}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-all",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <Settings className="w-4 h-4" />{!collapsed && "Settings"}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={cn(
                "w-full flex items-center rounded-lg text-sm text-[#D4A373] hover:text-red-400 hover:bg-red-900/20 transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
              )}
            >
              <LogOut className="w-4 h-4" />{!collapsed && "Sign out"}
            </button>
          </form>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex w-full items-center justify-center py-2 mt-1 rounded-lg text-[#7A8BA8] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Spacer for mobile fixed header */}
      <div className="md:hidden h-14" />
    </>
  );
}
