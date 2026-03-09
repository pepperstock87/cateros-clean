"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  Mail,
  Phone,
  Search,
  Users,
  Download,
  Plus,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { createClientAction } from "@/lib/actions/clients";
import type { ClientWithStats } from "./page";

const clientStatusColors: Record<string, string> = {
  lead: "bg-blue-900/30 text-blue-400",
  active: "bg-emerald-900/30 text-emerald-400",
  past: "bg-[#2A3A5C] text-[#D4A373]",
  archived: "bg-red-900/30 text-red-400",
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
  { value: "archived", label: "Archived" },
];

type SortKey = "name" | "revenue" | "eventCount" | "lastEvent";
type SortDir = "asc" | "desc";

export function ClientList({ clients }: { clients: ClientWithStats[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showNewModal, setShowNewModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter
  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.toLowerCase().includes(q) ?? false) ||
      (c.company_name?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        break;
      case "revenue":
        cmp = a.totalRevenue - b.totalRevenue;
        break;
      case "eventCount":
        cmp = a.eventCount - b.eventCount;
        break;
      case "lastEvent":
        cmp = (a.lastEventDate ?? "").localeCompare(b.lastEventDate ?? "");
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  }

  function handleCreateClient(formData: FormData) {
    startTransition(async () => {
      try {
        await createClientAction(formData);
        setShowNewModal(false);
      } catch (err) {
        console.error("Failed to create client:", err);
      }
    });
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8BA8]" />
          <input
            type="text"
            placeholder="Search by name, email, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#182030] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder-[#7A8BA8] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#182030] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const rows = sorted.map((c) => ({
              "First Name": c.first_name,
              "Last Name": c.last_name,
              Company: c.company_name ?? "",
              Email: c.email ?? "",
              Phone: c.phone ?? "",
              Status: c.status,
              Events: c.eventCount,
              Revenue: c.totalRevenue,
              "Last Event": c.lastEventDate
                ? format(new Date(c.lastEventDate + "T00:00:00"), "MMM d, yyyy")
                : "",
            }));
            downloadCSV(rows, "clients.csv");
          }}
          className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-primary text-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      {/* Empty state */}
      {clients.length === 0 && !showNewModal ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-[#7A8BA8] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No clients yet</h2>
          <p className="text-sm text-[#D4A373] mb-6">
            Add your first client to start managing your CRM.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add first client
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-[#D4A373]">No clients match your search.</p>
        </div>
      ) : (
        /* Table */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A3A5C] text-[#7A8BA8] text-xs uppercase tracking-wider">
                  <th
                    className="text-left px-4 py-3 cursor-pointer hover:text-[#F4F1ED] transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Name <SortIcon col="name" />
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Company</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Phone</th>
                  <th
                    className="text-center px-4 py-3 cursor-pointer hover:text-[#F4F1ED] transition-colors"
                    onClick={() => toggleSort("eventCount")}
                  >
                    Events <SortIcon col="eventCount" />
                  </th>
                  <th
                    className="text-right px-4 py-3 cursor-pointer hover:text-[#F4F1ED] transition-colors"
                    onClick={() => toggleSort("revenue")}
                  >
                    Revenue <SortIcon col="revenue" />
                  </th>
                  <th
                    className="text-right px-4 py-3 hidden md:table-cell cursor-pointer hover:text-[#F4F1ED] transition-colors"
                    onClick={() => toggleSort("lastEvent")}
                  >
                    Last Event <SortIcon col="lastEvent" />
                  </th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="border-b border-[#2A3A5C]/50 hover:bg-[#1A2538] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#F4F1ED]">
                      {client.first_name} {client.last_name}
                    </td>
                    <td className="px-4 py-3 text-[#D4A373] hidden md:table-cell">
                      {client.company_name ?? <span className="text-[#7A8BA8]">--</span>}
                    </td>
                    <td className="px-4 py-3 text-[#D4A373] hidden lg:table-cell">
                      {client.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-[#7A8BA8]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#D4A373] hidden lg:table-cell">
                      {client.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                      ) : (
                        <span className="text-[#7A8BA8]">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-[#F4F1ED]">{client.eventCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-brand-300">
                      {formatCurrency(client.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#7A8BA8] hidden md:table-cell">
                      {client.lastEventDate
                        ? format(new Date(client.lastEventDate + "T00:00:00"), "MMM d, yyyy")
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          clientStatusColors[client.status] ?? "bg-[#2A3A5C] text-[#D4A373]"
                        }`}
                      >
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewModal(false)}
          />
          <div className="relative bg-[#1A2538] border border-[#2A3A5C] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3A5C]">
              <h2 className="font-display text-lg font-semibold text-[#F4F1ED]">New Client</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-[#2A3A5C] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#7A8BA8]" />
              </button>
            </div>
            <form action={handleCreateClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7A8BA8] mb-1">First Name *</label>
                  <input
                    name="first_name"
                    required
                    className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#7A8BA8] mb-1">Last Name *</label>
                  <input
                    name="last_name"
                    required
                    className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#7A8BA8] mb-1">Company</label>
                <input
                  name="company_name"
                  className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7A8BA8] mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#7A8BA8] mb-1">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#7A8BA8] mb-1">Tags (comma-separated)</label>
                <input
                  name="tags"
                  placeholder="vip, corporate, wedding..."
                  className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] placeholder-[#7A8BA8] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                  onChange={(e) => {
                    // Store as JSON array in a hidden input
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    const hidden = e.target.form?.querySelector(
                      'input[name="tags"]'
                    ) as HTMLInputElement | null;
                    if (hidden) hidden.value = JSON.stringify(tags);
                  }}
                />
                <input type="hidden" name="tags" defaultValue="[]" />
              </div>
              <div>
                <label className="block text-xs text-[#7A8BA8] mb-1">Status</label>
                <select
                  name="status"
                  defaultValue="lead"
                  className="w-full px-3 py-2 bg-[#0C1220] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A373] focus:border-[#D4A373]"
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="past">Past</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
