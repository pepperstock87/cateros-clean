"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CatColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  hideOnMobile?: boolean;
}

interface CatDataTableProps<T> {
  data: T[];
  columns: CatColumn<T>[];
  keyFn: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

type SortDir = "asc" | "desc" | null;

export function CatDataTable<T>({
  data,
  columns,
  keyFn,
  onRowClick,
  emptyMessage = "No data to display",
  className,
  compact = false,
}: CatDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const getValue = col.sortValue;
    return [...data].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto -mx-4 md:mx-0", className)}>
      <div className="inline-block min-w-full align-middle px-4 md:px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider",
                    compact ? "py-2" : "py-2.5",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.sortable && "cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key && sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : sortKey === col.key && sortDir === "desc" ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedData.map((item) => (
              <tr
                key={keyFn(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[var(--bg-secondary)]"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      compact ? "py-2.5" : "py-3",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.hideOnMobile && "hidden sm:table-cell",
                      col.className
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
