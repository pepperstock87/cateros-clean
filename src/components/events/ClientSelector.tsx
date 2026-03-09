"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { createClientAction } from "@/lib/actions/clients";
import { Search, X, UserPlus, Loader2, Building2, Mail, Phone } from "lucide-react";

type ClientResult = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
};

interface Props {
  selectedClientId: string | null;
  clientName: string;
  onSelect: (client: ClientResult | null) => void;
}

export function ClientSelector({ selectedClientId, clientName, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline create form fields
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchClients = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const searchTerm = `%${term.trim()}%`;
      const { data } = await supabase
        .from("clients")
        .select("id, first_name, last_name, company_name, email, phone")
        .or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`
        )
        .order("last_name")
        .limit(8);
      setResults((data as ClientResult[]) ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setOpen(true);
    setShowCreate(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClients(value), 250);
  }

  function handleSelect(client: ClientResult) {
    onSelect(client);
    setQuery("");
    setOpen(false);
    setShowCreate(false);
  }

  function handleClear() {
    onSelect(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowCreate(false);
  }

  function openCreateForm() {
    setShowCreate(true);
    // Pre-fill first name from search query
    const parts = query.trim().split(/\s+/);
    setNewFirst(parts[0] || "");
    setNewLast(parts.slice(1).join(" ") || "");
    setNewEmail("");
    setNewPhone("");
    setNewCompany("");
    setCreateError(null);
  }

  async function handleCreate() {
    if (!newFirst.trim() || !newLast.trim()) {
      setCreateError("First and last name are required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const fd = new FormData();
      fd.set("first_name", newFirst.trim());
      fd.set("last_name", newLast.trim());
      fd.set("email", newEmail.trim());
      fd.set("phone", newPhone.trim());
      fd.set("company_name", newCompany.trim());
      fd.set("status", "active");
      fd.set("tags", "[]");
      const created = await createClientAction(fd);
      handleSelect({
        id: created.id,
        first_name: created.first_name,
        last_name: created.last_name,
        company_name: created.company_name,
        email: created.email,
        phone: created.phone,
      });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }

  const displayName = selectedClientId
    ? clientName
    : null;

  return (
    <div ref={containerRef} className="relative">
      <label className="label">Link to client</label>

      {displayName ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#182030] border border-[#2A3A5C]">
          <span className="flex-1 text-sm text-[#F4F1ED]">{displayName}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-[#7A8BA8] hover:text-red-400 transition-colors"
            title="Remove client link"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8BA8] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (query.trim()) setOpen(true); }}
            placeholder="Search clients by name, email, or company..."
            className="input pl-9"
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8BA8] animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && !selectedClientId && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#2A3A5C] bg-[#0F1623] shadow-xl max-h-80 overflow-y-auto">
          {results.length > 0 && (
            <ul className="py-1">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#182030] transition-colors"
                  >
                    <div className="text-sm font-medium text-[#F4F1ED]">
                      {c.first_name} {c.last_name}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.company_name && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#7A8BA8]">
                          <Building2 className="w-3 h-3" />
                          {c.company_name}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#7A8BA8]">
                          <Mail className="w-3 h-3" />
                          {c.email}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="px-3 py-3 text-sm text-[#7A8BA8]">No clients found.</div>
          )}

          {/* Create new client option */}
          {!showCreate ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="w-full text-left px-3 py-2.5 border-t border-[#2A3A5C] hover:bg-[#182030] transition-colors flex items-center gap-2 text-sm text-brand-400"
            >
              <UserPlus className="w-4 h-4" />
              Create new client{query.trim() ? `: "${query.trim()}"` : ""}
            </button>
          ) : (
            <div className="border-t border-[#2A3A5C] p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#F4F1ED]">
                <UserPlus className="w-4 h-4 text-brand-400" />
                New Client
              </div>

              {createError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded px-2 py-1.5">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-1 block">First name *</label>
                  <input
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    className="input text-sm py-1.5"
                    placeholder="First"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-1 block">Last name *</label>
                  <input
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    className="input text-sm py-1.5"
                    placeholder="Last"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-1 block">Email</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                  className="input text-sm py-1.5"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-1 block">Phone</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  type="tel"
                  className="input text-sm py-1.5"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#7A8BA8] mb-1 block">Company</label>
                <input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="input text-sm py-1.5"
                  placeholder="Company name"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? "Creating..." : "Create & select"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
