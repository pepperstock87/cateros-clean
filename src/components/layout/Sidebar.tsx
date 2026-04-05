"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, LayoutDashboard, CalendarDays, BookOpen, FileText, CreditCard, LogOut, Settings, Calendar, Menu, X, Palette, Sparkles, Receipt, Users, Package, ShoppingCart, Contact, LayoutTemplate, BarChart3, MapPin, Store, ChevronsLeft, ChevronsRight, Bell, Shield, Wallet, UtensilsCrossed, MoreHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { OrgSwitcher } from "@/components/layout/OrgSwitcher";
import { ActionBadge } from "@/components/cain/ActionBadge";
import { ROLE_LABELS } from "@/lib/roleLabels";
import type { BusinessType } from "@/types";

const SIDEBAR_COLLAPSED_KEY = "cateros-sidebar-collapsed";

type NavItem = { href: string; icon: typeof LayoutDashboard; label: string; module?: string; sub?: boolean };

type NavSection = {
  title: string;
  items: NavItem[];
};

const ALL_NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cain", icon: Sparkles, label: "C.A.I.N", module: "cain" },
  { href: "/reports", icon: BarChart3, label: "Reports", module: "reports" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/events", icon: CalendarDays, label: "Events", module: "events" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates", module: "templates" },
  { href: "/clients", icon: Contact, label: "Clients", module: "clients" },
  { href: "/schedule", icon: Calendar, label: "Schedule", module: "schedule" },
  { href: "/recipes", icon: BookOpen, label: "Recipes", module: "recipes" },
  { href: "/recipes/analytics", icon: BarChart3, label: "Recipe Analytics", module: "recipes", sub: true },
  { href: "/inventory", icon: Package, label: "Inventory", module: "inventory" },
  { href: "/prep", icon: UtensilsCrossed, label: "Prep", module: "production" },
  { href: "/staff", icon: Users, label: "Staff", module: "staff" },
  { href: "/rentals", icon: Package, label: "Rentals", module: "rentals" },
  { href: "/venues", icon: MapPin, label: "Venues", module: "venues" },
  { href: "/availability", icon: Calendar, label: "Availability", module: "availability" },
  { href: "/spaces", icon: Store, label: "Spaces", module: "spaces" },
  { href: "/vendor-profile", icon: Store, label: "Vendor Profile" },
  { href: "/branding", icon: Palette, label: "Branding" },
  { href: "/proposals", icon: FileText, label: "Proposals", module: "proposals" },
  { href: "/spending", icon: Receipt, label: "Spending", module: "spending" },
  { href: "/shopping", icon: ShoppingCart, label: "Shopping List", module: "shopping" },
  { href: "/billing", icon: CreditCard, label: "Billing", module: "billing" },
  { href: "/payouts", icon: Wallet, label: "Payouts", module: "billing" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/team/invites", icon: Users, label: "Team Invites", sub: true },
  { href: "/audit", icon: Shield, label: "Audit Log" },
];

// Maps module identifiers to their nav href for ordering
const MODULE_TO_HREF: Record<string, string> = {
  events: "/events",
  cain: "/cain",
  recipes: "/recipes",
  staff: "/staff",
  proposals: "/proposals",
  shopping: "/shopping",
  production: "/prep",
  schedule: "/schedule",
  clients: "/clients",
  calendar: "/schedule",
  billing: "/billing",
  inventory: "/inventory",
  venues: "/venues",
  availability: "/availability",
  spaces: "/spaces",
  templates: "/templates",
  reports: "/reports",
  spending: "/spending",
  rentals: "/rentals",
};

// Section groupings — maps href to section title
const NAV_SECTIONS: Record<string, string> = {
  "/dashboard": "operations",
  "/cain": "operations",
  "/events": "operations",
  "/availability": "operations",
  "/spaces": "operations",
  "/recipes": "kitchen",
  "/recipes/analytics": "kitchen",
  "/shopping": "kitchen",
  "/prep": "kitchen",
  "/proposals": "sales",
  "/branding": "sales",
  "/vendor-profile": "sales",
  "/staff": "team",
  "/schedule": "team",
  "/team": "team",
  "/team/invites": "team",
  "/notifications": "admin",
  "/audit": "admin",
};

const SECTION_TITLES: Record<string, string> = {
  operations: "Operations",
  kitchen: "Kitchen",
  sales: "Sales",
  team: "Team",
  admin: "Admin",
};


// Nav order per role — items in this list appear first, in this order
const ROLE_NAV_ORDER: Record<BusinessType, string[]> = {
  caterer: ["events", "cain", "recipes", "staff", "proposals", "shopping", "production", "schedule"],
  restaurant: ["events", "recipes", "staff", "inventory", "spending"],
  private_chef: ["events", "recipes", "shopping", "proposals", "clients"],
  venue: ["events", "spaces", "availability", "schedule", "venues", "proposals", "templates", "staff"],
  event_planner: ["events", "clients", "staff", "proposals", "templates", "schedule"],
  florist: ["events", "inventory", "schedule", "proposals", "templates"],
  band_entertainment: ["events", "schedule", "proposals", "billing"],
  rental_company: ["events", "inventory", "schedule", "proposals", "billing"],
  hospitality_management: ["events", "staff", "clients", "proposals", "reports", "billing"],
  other: ["events", "clients", "proposals", "billing", "schedule"],
};

export function Sidebar({ companyName }: { companyName?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [showMore, setShowMore] = useState(false);
  const [roleData, setRoleData] = useState<{
    businessType: BusinessType;
    enabledModules: string[];
  }>({ businessType: "caterer", enabledModules: [] });
  const [orgData, setOrgData] = useState<{
    currentOrg: { id: string; name: string; slug: string } | null;
    allOrgs: Array<{ id: string; name: string }>;
  }>({ currentOrg: null, allOrgs: [] });
  const [isDemo, setIsDemo] = useState(false);

  // Load collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
    setIsDemo(document.cookie.includes('cateros-demo-session'));
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

    // Fetch org data + role data for OrgSwitcher and adaptive nav
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id, business_type, enabled_modules, secondary_business_types")
        .eq("id", user.id)
        .single();

      if (profile?.business_type) {
        setRoleData({
          businessType: (profile.business_type as BusinessType) || "caterer",
          enabledModules: (profile.enabled_modules as string[]) || [],
        });
      }

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

  // Compute role-aware nav: primary items grouped by section, rest in "More"
  const { primarySections, moreNav } = useMemo(() => {
    const bt = roleData.businessType;
    const navOrder = ROLE_NAV_ORDER[bt] || ROLE_NAV_ORDER.caterer;
    const labels = ROLE_LABELS[bt] || {};

    // Apply label overrides to all nav items
    const labeledNav = ALL_NAV.map((item) => ({
      ...item,
      label: labels[item.href] || item.label,
    }));

    // Universal items (no module) always in primary
    const universalItems = labeledNav.filter(
      (item) => !item.module && !item.sub
    );

    // Get the ordered primary hrefs from role config
    const primaryHrefs = new Set<string>();
    for (const mod of navOrder) {
      const href = MODULE_TO_HREF[mod];
      if (href) primaryHrefs.add(href);
    }

    // Split module items into primary (ordered) vs more
    const moduleItems = labeledNav.filter((item) => item.module);
    const orderedPrimary: NavItem[] = [];
    const more: NavItem[] = [];

    // First add items in role order
    for (const mod of navOrder) {
      const href = MODULE_TO_HREF[mod];
      if (!href) continue;
      const items = moduleItems.filter(
        (item) => item.href === href || (item.sub && item.module === mod)
      );
      for (const item of items) {
        if (!orderedPrimary.some((p) => p.href === item.href)) {
          orderedPrimary.push(item);
        }
      }
    }

    // Remaining module items go to "More"
    for (const item of moduleItems) {
      if (!orderedPrimary.some((p) => p.href === item.href)) {
        more.push(item);
      }
    }

    // Dashboard always first, then primary role items, then other universal items
    const dashboard = universalItems.find((i) => i.href === "/dashboard");
    const otherUniversal = universalItems.filter((i) => i.href !== "/dashboard");

    const allPrimary = [
      ...(dashboard ? [dashboard] : []),
      ...orderedPrimary,
      ...otherUniversal,
    ];

    // Filter out billing/payouts for demo users and rename vendor profile
    const filterDemo = (items: NavItem[]) =>
      isDemo
        ? items
            .filter(i => !["/billing", "/payouts", "/team/invites", "/audit", "/prep"].includes(i.href))
            .map(i => i.href === "/vendor-profile" ? { ...i, label: "Vendors & Partners" } : i)
        : items;

    const filteredPrimary = filterDemo(allPrimary);
    const filteredMore = filterDemo(more);

    // Group primary nav by section
    const sectionMap: Record<string, NavItem[]> = {};
    const sectionOrder: string[] = [];

    for (const item of filteredPrimary) {
      const sectionKey = NAV_SECTIONS[item.href];
      if (sectionKey) {
        if (!sectionMap[sectionKey]) {
          sectionMap[sectionKey] = [];
          sectionOrder.push(sectionKey);
        }
        sectionMap[sectionKey].push(item);
      }
    }

    // Build sections array in order
    const sections: NavSection[] = sectionOrder.map((key) => ({
      title: SECTION_TITLES[key] || key,
      items: sectionMap[key],
    }));

    return {
      primarySections: sections,
      moreNav: filteredMore,
    };
  }, [roleData.businessType, isDemo]);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-sm font-semibold">Cateros</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "no-print fixed md:sticky top-0 z-40 md:z-0 h-screen bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col transition-all duration-200 md:translate-x-0",
        collapsed ? "md:w-16 w-56" : "w-56",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Desktop Header */}
        <div className="hidden md:block px-5 py-5 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold leading-tight">Cateros</div>
                {companyName && <div className="text-xs text-[var(--text-muted)] truncate leading-tight mt-0.5">{companyName}</div>}
              </div>
            )}
          </Link>
        </div>

        {/* Mobile Padding for fixed header */}
        <div className="md:hidden h-14" />

        {/* Org Switcher */}
        {orgData.currentOrg && !collapsed && (
          <div className="border-b border-[var(--border)]">
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
          {primarySections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5A6B88]">
                  {section.title}
                </div>
              )}
              {section.items.map(({ href, icon: Icon, label, sub }) => {
                const active = sub ? pathname === href : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                const isCain = href === "/cain";
                return (
                  <div key={href} className="relative">
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-lg font-medium transition-all duration-150",
                        collapsed
                          ? "justify-center px-0 py-2.5 text-sm"
                          : cn("gap-2.5", sub ? "pl-9 pr-3 py-1.5 text-xs" : "px-3 py-2.5 text-sm"),
                        active ? "bg-brand-950 text-brand-300 border border-brand-800/60" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
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
                    {isCain && <ActionBadge collapsed={collapsed} />}
                  </div>
                );
              })}
            </div>
          ))}

          {/* More section — collapsed role-secondary items */}
          {moreNav.length > 0 && !collapsed && (
            <>
              <button
                onClick={() => setShowMore((p) => !p)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors rounded-lg"
              >
                <MoreHorizontal className="w-4 h-4" />
                More
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                  {moreNav.length}
                </span>
              </button>
              {showMore && moreNav.map(({ href, icon: Icon, label, sub }) => {
                const active = sub ? pathname === href : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                const isCain = href === "/cain";
                return (
                  <div key={href} className="relative">
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center rounded-lg font-medium transition-all duration-150",
                        cn("gap-2.5", sub ? "pl-9 pr-3 py-1.5 text-xs" : "pl-9 pr-3 py-2 text-sm"),
                        active ? "bg-brand-950 text-brand-300 border border-brand-800/60" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      )}
                    >
                      <Icon className={cn("flex-shrink-0", sub ? "w-3.5 h-3.5" : "w-4 h-4", active ? "text-brand-400" : "")} />
                      {label}
                    </Link>
                    {isCain && <ActionBadge collapsed={false} />}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className={cn("py-3 border-t border-[var(--border)] space-y-0.5", collapsed ? "px-2" : "px-3")}>
          <NotificationBell collapsed={collapsed} />
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <Settings className="w-4 h-4" />{!collapsed && "Settings"}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              aria-label="Sign out"
              className={cn(
                "w-full flex items-center rounded-lg text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-900/20 transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
              )}
            >
              <LogOut className="w-4 h-4" />{!collapsed && "Sign out"}
            </button>
          </form>

          {/* Theme Toggle */}
          <ThemeToggle collapsed={collapsed} />

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex w-full items-center justify-center py-2 mt-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
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
