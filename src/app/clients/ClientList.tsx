"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Mail, Phone, CalendarDays, DollarSign, Search, Users, Download, ChevronRight } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import type { ClientData } from "./page";

const statusColors: Record<string, string> = {
  draft: "bg-[#2e271f] text-[#9c8876]",
  proposed: "bg-blue-900/30 text-blue-400",
  confirmed: "bg-emerald-900/30 text-emerald-400",
  completed: "bg-green-900/30 text-green-400",
  canceled: "bg-red-900/30 text-red-400",
};

export function ClientList({ clients }: { clients: ClientData[] }) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5a4a]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1a1714] border border-[#2e271f] rounded-lg text-[#f5ede0] placeholder-[#6b5a4a] text-sm focus:outline-none focus:ring-1 focus:ring-[#9c8876] focus:border-[#9c8876]"
          />
        </div>
        <button
          onClick={() => {
            const rows = filtered.map((c) => ({
              "Client Name": c.name,
              Email: c.email ?? null,
              Phone: c.phone ?? null,
              Events: c.eventCount,
              Revenue: c.totalRevenue,
              "Last Event": format(new Date(c.mostRecentDate + "T00:00:00"), "MMM d, yyyy"),
            }));
            downloadCSV(rows, "clients.csv");
          }}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-[#9c8876]">No clients match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((client) => (
            <div key={client.name.toLowerCase()} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Name and contact */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/clients/${encodeURIComponent(client.name)}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#f5ede0] text-lg truncate hover:text-brand-300 transition-colors group/name"
                  >
                    {client.name}
                    <ChevronRight className="w-4 h-4 text-[#6b5a4a] group-hover/name:text-brand-300 transition-colors shrink-0" />
                  </Link>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#9c8876]">
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-[#f5ede0] transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {client.email}
                      </a>
                    )}
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="inline-flex items-center gap-1.5 hover:text-[#f5ede0] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {client.phone}
                      </a>
                    )}
                  </div>

                  {/* Status pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {Object.entries(client.statusDistribution).map(([status, count]) => (
                      <span
                        key={status}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] ?? "bg-[#2e271f] text-[#9c8876]"}`}
                      >
                        {count} {status}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Stats and link */}
                <div className="flex flex-row sm:flex-col items-end gap-3 sm:gap-2 text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-sm text-[#f5ede0]">
                    <DollarSign className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="font-medium">{formatCurrency(client.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#9c8876]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{client.eventCount} {client.eventCount === 1 ? "event" : "events"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-[#6b5a4a]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Last: {format(new Date(client.mostRecentDate + "T00:00:00"), "MMM d, yyyy")}</span>
                  </div>
                  <Link
                    href={`/events?client=${encodeURIComponent(client.name)}`}
                    className="btn-secondary text-xs mt-1"
                  >
                    View events
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
