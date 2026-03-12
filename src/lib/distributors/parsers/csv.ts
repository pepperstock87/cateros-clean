// Generic CSV Parser with Configurable Column Mapping
//
// Handles distributor-specific CSV formats by mapping their column headers
// to normalized field names. Supports tab, comma, and pipe delimiters.
// Handles quoted fields, BOM markers, and Windows line endings.

export interface ColumnMapping {
  [normalizedField: string]: string; // normalizedField -> CSV column header
}

export interface ParsedRow {
  data: Record<string, string>; // normalized field values
  _raw: Record<string, string>; // original column names preserved
  _lineNumber: number;
}

export interface CsvParseOptions {
  columnMapping: ColumnMapping;
  delimiter?: string; // auto-detect if not specified
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  headerRowIndex?: number; // default 0
}

/**
 * Parse a CSV/TSV buffer into normalized rows using column mapping.
 */
export function parseCsv(
  buffer: Buffer,
  options: CsvParseOptions
): { rows: ParsedRow[]; headers: string[]; unmappedColumns: string[] } {
  let content = buffer.toString("utf-8");

  // Remove BOM
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  // Normalize line endings
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = content.split("\n");
  if (lines.length === 0) return { rows: [], headers: [], unmappedColumns: [] };

  // Auto-detect delimiter
  const headerLine = lines[options.headerRowIndex ?? 0];
  const delimiter =
    options.delimiter ||
    detectDelimiter(headerLine);

  // Parse header row
  const headers = parseLine(headerLine, delimiter);

  // Build reverse mapping: CSV header -> normalized field
  const reverseMap = new Map<string, string>();
  for (const [normalized, csvHeader] of Object.entries(options.columnMapping)) {
    // Case-insensitive header matching
    const matchedHeader = headers.find(
      (h) => h.toLowerCase().trim() === csvHeader.toLowerCase().trim()
    );
    if (matchedHeader) {
      reverseMap.set(matchedHeader, normalized);
    }
  }

  const unmappedColumns = headers.filter((h) => !reverseMap.has(h) && h.trim() !== "");

  // Parse data rows
  const rows: ParsedRow[] = [];
  const startRow = (options.headerRowIndex ?? 0) + 1;

  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (options.skipEmptyRows !== false && !line.trim()) continue;

    const values = parseLine(line, delimiter);
    const raw: Record<string, string> = {};
    const normalized: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j] ?? "";
      if (options.trimValues !== false) value = value.trim();

      raw[header] = value;
      const normalizedField = reverseMap.get(header);
      if (normalizedField) {
        normalized[normalizedField] = value;
      }
    }

    rows.push({
      data: normalized,
      _raw: raw,
      _lineNumber: i + 1,
    });
  }

  return { rows, headers, unmappedColumns };
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Auto-detect delimiter from header line.
 */
function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { "\t": 0, ",": 0, "|": 0 };
  for (const char of line) {
    if (char in counts) counts[char]++;
  }
  // Pick the delimiter with the highest count
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}
