import type {
  ExtractedEntities,
  ExtractedEntity,
  ExtractionConfidence,
} from "./types";

// ---------- Factory ----------

export function createEntityState(): ExtractedEntities {
  return {
    event: {},
    client: {},
    menu: [],
    staffing: [],
    rentals: [],
    timeline: [],
  };
}

// ---------- Merge ----------

/**
 * Merges a partial entity update into the current state.
 * User corrections (confidence "confirmed" with source "user_correction")
 * cannot be overwritten by "inferred" or "assumed" values.
 */
export function mergeEntityUpdate(
  current: ExtractedEntities,
  update: Partial<ExtractedEntities>
): ExtractedEntities {
  const next = { ...current };

  // Merge record-style categories (event, client)
  for (const category of ["event", "client"] as const) {
    if (!update[category]) continue;
    const existing = { ...current[category] };
    for (const [key, entity] of Object.entries(update[category]!)) {
      const prev = existing[key];
      if (prev && isUserCorrected(prev) && !isUserCorrected(entity)) {
        continue; // Don't overwrite user corrections with lower-confidence values
      }
      existing[key] = entity;
    }
    next[category] = existing;
  }

  // Merge array-style categories (menu, staffing, rentals, timeline)
  for (const category of ["menu", "staffing", "rentals", "timeline"] as const) {
    if (!update[category] || update[category]!.length === 0) continue;
    const existing = [...current[category]];
    for (const entity of update[category]!) {
      const idx = existing.findIndex((e) => e.key === entity.key);
      if (idx >= 0) {
        const prev = existing[idx];
        if (isUserCorrected(prev) && !isUserCorrected(entity)) continue;
        existing[idx] = entity;
      } else {
        existing.push(entity);
      }
    }
    next[category] = existing;
  }

  // Merge scalar entities (budget, serviceStyle)
  for (const field of ["budget", "serviceStyle"] as const) {
    if (!update[field]) continue;
    const prev = current[field];
    if (prev && isUserCorrected(prev) && !isUserCorrected(update[field]!)) {
      continue;
    }
    next[field] = update[field];
  }

  return next;
}

function isUserCorrected(entity: ExtractedEntity): boolean {
  return entity.confidence === "confirmed" && entity.source === "user_correction";
}

// ---------- Tool-based extraction ----------

/**
 * Deterministic extraction from tool call results.
 * Returns a partial update if entities can be inferred, or null otherwise.
 */
export function extractFromToolResult(
  toolName: string,
  input: Record<string, unknown>,
  result: string,
  _current: ExtractedEntities
): Partial<ExtractedEntities> | null {
  const now = Date.now();

  switch (toolName) {
    case "lookup_clients": {
      try {
        const data = JSON.parse(result);
        if (Array.isArray(data) && data.length > 0) {
          const match = data[0];
          const client: Record<string, ExtractedEntity> = {};
          if (match.name) {
            client.client_name = {
              key: "client_name",
              value: match.name,
              confidence: "inferred",
              source: "lookup_clients",
              updatedAt: now,
            };
          }
          if (match.id) {
            client.client_id = {
              key: "client_id",
              value: match.id,
              confidence: "inferred",
              source: "lookup_clients",
              updatedAt: now,
            };
          }
          if (match.email) {
            client.client_email = {
              key: "client_email",
              value: match.email,
              confidence: "inferred",
              source: "lookup_clients",
              updatedAt: now,
            };
          }
          if (match.phone) {
            client.client_phone = {
              key: "client_phone",
              value: match.phone,
              confidence: "inferred",
              source: "lookup_clients",
              updatedAt: now,
            };
          }
          return Object.keys(client).length > 0 ? { client } : null;
        }
      } catch {
        // Result wasn't parseable JSON
      }
      return null;
    }

    case "lookup_staff_availability": {
      if (input.date && typeof input.date === "string") {
        return {
          event: {
            event_date: {
              key: "event_date",
              value: input.date,
              confidence: "inferred",
              source: "lookup_staff_availability",
              updatedAt: now,
            },
          },
        };
      }
      return null;
    }

    case "lookup_recipes": {
      try {
        const data = JSON.parse(result);
        if (Array.isArray(data) && data.length > 0) {
          const menu: ExtractedEntity[] = data.slice(0, 10).map((r: { name: string }) => ({
            key: `recipe_${r.name.toLowerCase().replace(/\s+/g, "_")}`,
            value: r.name,
            confidence: "inferred" as ExtractionConfidence,
            source: "lookup_recipes",
            updatedAt: now,
          }));
          return { menu };
        }
      } catch {
        // Not parseable
      }
      return null;
    }

    default:
      return null;
  }
}

// ---------- Normalize tool input ----------

interface RawEntityField {
  value: string | number | null;
  confidence?: ExtractionConfidence;
}

/**
 * Converts the raw shape from Claude's update_extracted_entities tool call
 * into a typed Partial<ExtractedEntities>.
 */
export function normalizeToolUpdate(
  raw: Record<string, unknown>
): Partial<ExtractedEntities> {
  const now = Date.now();
  const result: Partial<ExtractedEntities> = {};

  // Record-style: event, client
  for (const category of ["event", "client"] as const) {
    const section = raw[category];
    if (!section || typeof section !== "object") continue;
    const record: Record<string, ExtractedEntity> = {};
    for (const [key, val] of Object.entries(section as Record<string, unknown>)) {
      const field = val as RawEntityField;
      if (field && typeof field === "object" && "value" in field) {
        record[key] = {
          key,
          value: field.value,
          confidence: field.confidence || "inferred",
          source: "update_extracted_entities",
          updatedAt: now,
        };
      }
    }
    if (Object.keys(record).length > 0) {
      result[category] = record;
    }
  }

  // Array-style: menu, staffing, rentals, timeline
  for (const category of ["menu", "staffing", "rentals", "timeline"] as const) {
    const section = raw[category];
    if (!Array.isArray(section)) continue;
    const entities: ExtractedEntity[] = [];
    for (const item of section) {
      if (item && typeof item === "object" && "value" in item) {
        const field = item as RawEntityField & { key?: string };
        entities.push({
          key: field.key || `${category}_${entities.length}`,
          value: field.value,
          confidence: field.confidence || "inferred",
          source: "update_extracted_entities",
          updatedAt: now,
        });
      }
    }
    if (entities.length > 0) {
      result[category] = entities;
    }
  }

  // Scalar: budget, serviceStyle
  for (const field of ["budget", "serviceStyle"] as const) {
    const val = raw[field];
    if (val && typeof val === "object" && "value" in val) {
      const f = val as RawEntityField;
      result[field] = {
        key: field,
        value: f.value,
        confidence: f.confidence || "inferred",
        source: "update_extracted_entities",
        updatedAt: now,
      };
    }
  }

  return result;
}
