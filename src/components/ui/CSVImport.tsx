"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Download, Loader2, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  entityType: "clients" | "recipes" | "staff";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onImport: (records: any[]) => Promise<{ success: number; errors: string[] }>;
  expectedColumns: string[];
  sampleRow: Record<string, string>;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "results";

/** Parse CSV text handling quoted fields with commas and newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(field.trim());
        if (row.some((f) => f !== "")) rows.push(row);
        row = [];
        field = "";
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // Last field / row
  row.push(field.trim());
  if (row.some((f) => f !== "")) rows.push(row);

  return rows;
}

export function CSVImport({ entityType, onImport, expectedColumns, sampleRow }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setColumnMap({});
    setImportProgress(0);
    setResults(null);
  }, []);

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) return; // need header + at least one row
      const csvHeaders = parsed[0];
      const dataRows = parsed.slice(1);
      setHeaders(csvHeaders);
      setRawRows(dataRows);

      // Auto-map columns by matching header names
      const autoMap: Record<number, string> = {};
      csvHeaders.forEach((h, i) => {
        const normalized = h.toLowerCase().replace(/[\s_-]+/g, "_").replace(/[^a-z0-9_]/g, "");
        const match = expectedColumns.find((col) => {
          const colNorm = col.toLowerCase().replace(/[\s_-]+/g, "_");
          return normalized === colNorm || normalized.includes(colNorm) || colNorm.includes(normalized);
        });
        if (match) autoMap[i] = match;
      });
      setColumnMap(autoMap);
      setStep("mapping");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function getMappedRecords(): Record<string, string>[] {
    return rawRows.map((row) => {
      const record: Record<string, string> = {};
      Object.entries(columnMap).forEach(([colIdx, field]) => {
        record[field] = row[Number(colIdx)] ?? "";
      });
      return record;
    });
  }

  function getRequiredFields(): string[] {
    if (entityType === "clients") return ["first_name"];
    if (entityType === "recipes") return ["name"];
    if (entityType === "staff") return ["name"];
    return [];
  }

  function getValidationErrors(record: Record<string, string>): string[] {
    const errs: string[] = [];
    for (const req of getRequiredFields()) {
      if (!record[req]?.trim()) errs.push(`Missing ${req}`);
    }
    return errs;
  }

  function handleProceedToPreview() {
    setStep("preview");
  }

  async function handleImport() {
    setStep("importing");
    setImportProgress(0);

    const records = getMappedRecords().filter(
      (r) => getValidationErrors(r).length === 0
    );

    // Simulate progress increments
    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 5, 90));
    }, 200);

    try {
      const result = await onImport(records);
      clearInterval(progressInterval);
      setImportProgress(100);
      setResults(result);
      setStep("results");
      router.refresh();
    } catch {
      clearInterval(progressInterval);
      setResults({ success: 0, errors: ["Import failed unexpectedly."] });
      setStep("results");
    }
  }

  function downloadSampleCSV() {
    const headerLine = expectedColumns.join(",");
    const sampleLine = expectedColumns.map((col) => {
      const val = sampleRow[col] ?? "";
      return val.includes(",") ? `"${val}"` : val;
    }).join(",");
    const csv = `${headerLine}\n${sampleLine}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mappedRecords = step === "preview" || step === "importing" ? getMappedRecords() : [];
  const validCount = mappedRecords.filter((r) => getValidationErrors(r).length === 0).length;
  const warningCount = mappedRecords.length - validCount;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap"
      >
        <Upload className="w-3.5 h-3.5" />
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="relative bg-[#1A2538] border border-[#2A3A5C] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A3A5C]">
              <h2 className="font-display text-lg font-semibold text-[#F4F1ED]">
                Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-[#2A3A5C] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#7A8BA8]" />
              </button>
            </div>

            <div className="p-6">
              {/* Upload Step */}
              {step === "upload" && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                      dragOver
                        ? "border-[#D4A373] bg-[#D4A373]/5"
                        : "border-[#2A3A5C] hover:border-[#7A8BA8]"
                    }`}
                  >
                    <FileSpreadsheet className="w-10 h-10 text-[#7A8BA8] mx-auto mb-3" />
                    <p className="text-sm text-[#F4F1ED] mb-1">
                      Drag and drop a CSV file, or click to browse
                    </p>
                    <p className="text-xs text-[#7A8BA8]">
                      Only .csv files are accepted
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>
                  <button
                    onClick={downloadSampleCSV}
                    className="flex items-center gap-2 text-xs text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download sample CSV template
                  </button>
                </div>
              )}

              {/* Mapping Step */}
              {step === "mapping" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#F4F1ED] font-medium">Map columns</p>
                      <p className="text-xs text-[#7A8BA8] mt-0.5">
                        {fileName} - {rawRows.length} row{rawRows.length !== 1 ? "s" : ""} detected
                      </p>
                    </div>
                    <button
                      onClick={downloadSampleCSV}
                      className="flex items-center gap-1.5 text-xs text-[#D4A373] hover:text-[#F4F1ED] transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Template
                    </button>
                  </div>

                  <div className="space-y-2">
                    {headers.map((header, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-[#0C1220] rounded-lg px-4 py-2.5"
                      >
                        <span className="text-sm text-[#F4F1ED] flex-1 truncate">
                          {header}
                        </span>
                        <span className="text-xs text-[#7A8BA8]">→</span>
                        <select
                          value={columnMap[idx] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColumnMap((prev) => {
                              const next = { ...prev };
                              if (val) next[idx] = val;
                              else delete next[idx];
                              return next;
                            });
                          }}
                          className="w-44 px-2 py-1.5 bg-[#182030] border border-[#2A3A5C] rounded-lg text-[#F4F1ED] text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A373]"
                        >
                          <option value="">-- skip --</option>
                          {expectedColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={reset} className="btn-secondary text-sm">
                      Back
                    </button>
                    <button
                      onClick={handleProceedToPreview}
                      disabled={Object.keys(columnMap).length === 0}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Step */}
              {step === "preview" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#F4F1ED] font-medium">Preview import</p>
                    <p className="text-xs text-[#7A8BA8] mt-0.5">
                      Ready to import {validCount} record{validCount !== 1 ? "s" : ""}
                      {warningCount > 0 && (
                        <span className="text-yellow-400">
                          {" "}({warningCount} will be skipped — missing required fields)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Preview table — first 5 rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#2A3A5C] text-[#7A8BA8]">
                          <th className="text-left px-3 py-2 w-8">#</th>
                          {expectedColumns
                            .filter((col) => Object.values(columnMap).includes(col))
                            .map((col) => (
                              <th key={col} className="text-left px-3 py-2">
                                {col}
                              </th>
                            ))}
                          <th className="text-center px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappedRecords.slice(0, 5).map((record, i) => {
                          const errs = getValidationErrors(record);
                          return (
                            <tr
                              key={i}
                              className={`border-b border-[#2A3A5C]/50 ${
                                errs.length > 0 ? "bg-red-900/10" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-[#7A8BA8]">{i + 1}</td>
                              {expectedColumns
                                .filter((col) => Object.values(columnMap).includes(col))
                                .map((col) => (
                                  <td key={col} className="px-3 py-2 text-[#F4F1ED]">
                                    {record[col] || (
                                      <span className="text-[#7A8BA8]">--</span>
                                    )}
                                  </td>
                                ))}
                              <td className="px-3 py-2 text-center">
                                {errs.length > 0 ? (
                                  <span className="text-red-400" title={errs.join(", ")}>
                                    <AlertTriangle className="w-3.5 h-3.5 inline" />
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    <CheckCircle className="w-3.5 h-3.5 inline" />
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {mappedRecords.length > 5 && (
                    <p className="text-xs text-[#7A8BA8] text-center">
                      ...and {mappedRecords.length - 5} more row{mappedRecords.length - 5 !== 1 ? "s" : ""}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setStep("mapping")}
                      className="btn-secondary text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={validCount === 0}
                      className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import {validCount} record{validCount !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              )}

              {/* Importing Step */}
              {step === "importing" && (
                <div className="space-y-4 py-8 text-center">
                  <Loader2 className="w-8 h-8 text-[#D4A373] mx-auto animate-spin" />
                  <p className="text-sm text-[#F4F1ED]">Importing records...</p>
                  <div className="w-full bg-[#0C1220] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-[#D4A373] rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#7A8BA8]">{importProgress}%</p>
                </div>
              )}

              {/* Results Step */}
              {step === "results" && results && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    {results.success > 0 ? (
                      <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    ) : (
                      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    )}
                    <p className="text-sm text-[#F4F1ED] font-medium">
                      Imported {results.success} record{results.success !== 1 ? "s" : ""} successfully
                      {results.errors.length > 0 && (
                        <span className="text-red-400">
                          , {results.errors.length} failed
                        </span>
                      )}
                    </p>
                  </div>

                  {results.errors.length > 0 && (
                    <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-xs text-red-400 font-medium mb-2">Errors:</p>
                      <ul className="space-y-1">
                        {results.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-300">
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button onClick={handleClose} className="btn-primary text-sm">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
