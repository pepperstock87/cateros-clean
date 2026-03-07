"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  CalendarDays,
  BookOpen,
  Users,
  Contact,
  ArrowRight,
} from "lucide-react";

interface EventResult {
  id: string;
  name: string;
  client_name: string | null;
  event_date: string | null;
  status: string | null;
}

interface RecipeResult {
  id: string;
  name: string;
  category: string | null;
}

interface StaffResult {
  id: string;
  name: string;
  role: string | null;
}

interface ClientResult {
  name: string;
}

interface SearchResults {
  events: EventResult[];
  recipes: RecipeResult[];
  staff: StaffResult[];
  clients: ClientResult[];
}

const EMPTY: SearchResults = { events: [], recipes: [], staff: [], clients: [] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Build a flat list of navigable results for keyboard navigation
  const flatResults = buildFlatResults(results);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setQuery("");
      setResults(EMPTY);
      setActiveIndex(0);
    }
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(EMPTY);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (!q) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();

      const [eventsRes, recipesRes, staffRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, client_name, event_date, status")
          .or(`name.ilike.%${q}%,client_name.ilike.%${q}%`)
          .limit(5),
        supabase
          .from("recipes")
          .select("id, name, category")
          .ilike("name", `%${q}%`)
          .limit(5),
        supabase
          .from("staff_members")
          .select("id, name, role")
          .ilike("name", `%${q}%`)
          .limit(5),
      ]);

      const events = (eventsRes.data ?? []) as EventResult[];
      const recipes = (recipesRes.data ?? []) as RecipeResult[];
      const staff = (staffRes.data ?? []) as StaffResult[];

      // Deduplicate clients from events
      const clientMap = new Map<string, ClientResult>();
      for (const event of events) {
        if (
          event.client_name &&
          event.client_name.toLowerCase().includes(q.toLowerCase())
        ) {
          clientMap.set(event.client_name, { name: event.client_name });
        }
      }
      const clients = Array.from(clientMap.values());

      setResults({ events, recipes, staff, clients });
      setLoading(false);
    }, 300);
  }, []);

  // Keyboard navigation within the palette
  function handlePaletteKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && flatResults[activeIndex]) {
      e.preventDefault();
      navigate(flatResults[activeIndex].href);
    }
  }

  const hasResults =
    results.events.length > 0 ||
    results.recipes.length > 0 ||
    results.staff.length > 0 ||
    results.clients.length > 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6b5a4a] hover:text-[#f5ede0] hover:bg-[#1c1814] transition-all border border-[#2e271f] bg-[#0f0d0b]"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1c1814] border border-[#2e271f] text-[10px] font-mono text-[#6b5a4a]">
          ⌘K
        </kbd>
      </button>
    );
  }

  let runningIndex = 0;

  return (
    <>
      {/* Trigger button (hidden when open) */}
      <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#6b5a4a] border border-[#2e271f] bg-[#0f0d0b] opacity-50 cursor-default">
        <Search className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1c1814] border border-[#2e271f] text-[10px] font-mono text-[#6b5a4a]">
          ⌘K
        </kbd>
      </button>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
        onClick={(e) => {
          if (e.target === overlayRef.current) close();
        }}
      >
        {/* Modal */}
        <div
          className="w-full max-w-lg bg-[#1a1714] border border-[#2e271f] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onKeyDown={handlePaletteKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[#2e271f] bg-[#0f0d0b]">
            <Search className="w-4 h-4 text-[#6b5a4a] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search events, recipes, staff, clients..."
              className="flex-1 py-3.5 bg-transparent text-[#f5ede0] placeholder:text-[#6b5a4a] text-sm outline-none"
            />
            <kbd
              onClick={close}
              className="cursor-pointer px-1.5 py-0.5 rounded bg-[#1c1814] border border-[#2e271f] text-[10px] font-mono text-[#6b5a4a] hover:text-[#f5ede0] transition-colors"
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.trim() && !loading && !hasResults && (
              <div className="px-4 py-8 text-center text-sm text-[#6b5a4a]">
                No results found for &quot;{query.trim()}&quot;
              </div>
            )}

            {loading && !hasResults && (
              <div className="px-4 py-8 text-center text-sm text-[#6b5a4a]">
                Searching...
              </div>
            )}

            {hasResults && (
              <div className="py-2">
                {/* Events */}
                {results.events.length > 0 && (
                  <ResultGroup label="Events">
                    {results.events.map((event) => {
                      const idx = runningIndex++;
                      return (
                        <ResultItem
                          key={`event-${event.id}`}
                          icon={<CalendarDays className="w-4 h-4" />}
                          title={event.name}
                          detail={[event.client_name, event.event_date].filter(Boolean).join(" - ")}
                          active={activeIndex === idx}
                          onClick={() => navigate(`/events/${event.id}`)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {/* Recipes */}
                {results.recipes.length > 0 && (
                  <ResultGroup label="Recipes">
                    {results.recipes.map((recipe) => {
                      const idx = runningIndex++;
                      return (
                        <ResultItem
                          key={`recipe-${recipe.id}`}
                          icon={<BookOpen className="w-4 h-4" />}
                          title={recipe.name}
                          detail={recipe.category ?? ""}
                          active={activeIndex === idx}
                          onClick={() => navigate(`/recipes/${recipe.id}`)}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {/* Staff */}
                {results.staff.length > 0 && (
                  <ResultGroup label="Staff">
                    {results.staff.map((member) => {
                      const idx = runningIndex++;
                      return (
                        <ResultItem
                          key={`staff-${member.id}`}
                          icon={<Users className="w-4 h-4" />}
                          title={member.name}
                          detail={member.role ?? ""}
                          active={activeIndex === idx}
                          onClick={() => navigate("/staff")}
                        />
                      );
                    })}
                  </ResultGroup>
                )}

                {/* Clients */}
                {results.clients.length > 0 && (
                  <ResultGroup label="Clients">
                    {results.clients.map((client) => {
                      const idx = runningIndex++;
                      return (
                        <ResultItem
                          key={`client-${client.name}`}
                          icon={<Contact className="w-4 h-4" />}
                          title={client.name}
                          detail="View events"
                          active={activeIndex === idx}
                          onClick={() =>
                            navigate(
                              `/events?client=${encodeURIComponent(client.name)}`
                            )
                          }
                        />
                      );
                    })}
                  </ResultGroup>
                )}
              </div>
            )}

            {!query.trim() && (
              <div className="px-4 py-8 text-center text-sm text-[#6b5a4a]">
                Start typing to search...
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ResultGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1.5 text-[#6b5a4a] uppercase text-xs tracking-wider font-medium">
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  icon,
  title,
  detail,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
        active ? "bg-[#251f19]" : "hover:bg-[#251f19]"
      }`}
    >
      <span className="text-[#9c8876] flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-[#f5ede0] block truncate">{title}</span>
        {detail && (
          <span className="text-[#9c8876] text-xs block truncate">{detail}</span>
        )}
      </span>
      <ArrowRight
        className={`w-3.5 h-3.5 text-[#6b5a4a] flex-shrink-0 transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function buildFlatResults(
  results: SearchResults
): { href: string; type: string }[] {
  const flat: { href: string; type: string }[] = [];
  for (const event of results.events) {
    flat.push({ href: `/events/${event.id}`, type: "event" });
  }
  for (const recipe of results.recipes) {
    flat.push({ href: `/recipes/${recipe.id}`, type: "recipe" });
  }
  for (const member of results.staff) {
    flat.push({ href: "/staff", type: "staff" });
  }
  for (const client of results.clients) {
    flat.push({
      href: `/events?client=${encodeURIComponent(client.name)}`,
      type: "client",
    });
  }
  return flat;
}
