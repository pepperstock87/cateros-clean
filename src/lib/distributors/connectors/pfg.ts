// PFG (Performance Food Group) Connector
//
// PFG's CustomerFirst platform provides ordering and invoice workflows.
// Integration typically works via:
//   - CSV/Excel file export for catalogs and order guides
//   - EDI for invoices (810) and purchase orders (850)
//   - SFTP for automated file exchange
//   - Manual upload as fallback
//
// This connector handles all transports behind a single interface.
// Column mappings are configurable per account in distributor.config.

import { createClient } from "@/lib/supabase/server";
import { parseCsv, type ColumnMapping } from "../parsers/csv";
import type {
  DistributorTransport,
  ConnectorInput,
  CatalogImportResult,
  InvoiceImportResult,
  PFGConfig,
} from "../types";
import type { DistributorConnector, ConnectorContext } from "../connector";

// Default PFG catalog column mapping
// Users can override these in distributor.config.catalog_columns
const DEFAULT_CATALOG_COLUMNS: ColumnMapping = {
  sku: "Item#",
  name: "Description",
  brand: "Brand",
  pack_size: "Pack",
  unit: "Size",
  unit_price: "Price",
  category: "Category",
};

// Default PFG invoice column mapping
const DEFAULT_INVOICE_COLUMNS: ColumnMapping = {
  invoice_number: "Invoice#",
  invoice_date: "Date",
  sku: "Item#",
  product_name: "Description",
  quantity: "Qty",
  unit_price: "Price",
  extended_price: "Extended",
  due_date: "Due Date",
};

export class PFGConnector implements DistributorConnector {
  readonly connectorType = "pfg" as const;
  readonly supportedTransports: DistributorTransport[] = [
    "file_upload",
    "manual_csv",
    "sftp",
    "edi",
  ];
  readonly displayName = "Performance Food Group (PFG)";

  async importCatalog(
    ctx: ConnectorContext,
    input: ConnectorInput
  ): Promise<CatalogImportResult> {
    const config = ctx.config as PFGConfig;
    let fileBuffer: Buffer;
    let filename: string;

    switch (input.transport) {
      case "file_upload":
      case "manual_csv":
        fileBuffer = input.fileBuffer;
        filename = input.filename;
        break;
      case "sftp":
        // Future: connect to PFG SFTP and download catalog file
        throw new Error("SFTP catalog import not yet implemented. Upload the file manually.");
      case "edi":
        // EDI catalog (rare for PFG) — treat raw data as CSV-like
        fileBuffer = Buffer.from(input.rawData);
        filename = "edi-catalog.txt";
        break;
      default:
        throw new Error(`Unsupported transport for PFG catalog import: ${input.transport}`);
    }

    // Merge default columns with user overrides
    const columnMapping = {
      ...DEFAULT_CATALOG_COLUMNS,
      ...(config.catalog_columns || {}),
    };

    const { rows, unmappedColumns } = parseCsv(fileBuffer, {
      columnMapping,
      skipEmptyRows: true,
      trimValues: true,
    });

    if (rows.length === 0) {
      return {
        productsUpserted: 0,
        productsDeactivated: 0,
        priceChanges: [],
        errors: [{ sku: "", error: "No data rows found in file" }],
      };
    }

    const supabase = await createClient();

    // Get existing products for price comparison
    const { data: existing } = await supabase
      .from("distributor_products")
      .select("id, sku, unit_price, name")
      .eq("distributor_id", ctx.distributorId);

    const existingMap = new Map(
      (existing ?? []).map((p: any) => [p.sku, { id: p.id, price: p.unit_price, name: p.name }])
    );

    const priceChanges: CatalogImportResult["priceChanges"] = [];
    const errors: CatalogImportResult["errors"] = [];
    const skusSeen = new Set<string>();
    let upserted = 0;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const upsertRows = [];

      for (const row of batch) {
        const d = row.data;
        const sku = d.sku;
        if (!sku) {
          errors.push({ sku: `line ${row._lineNumber}`, error: "Missing SKU" });
          continue;
        }

        skusSeen.add(sku);

        const unitPrice = parseFloat(d.unit_price) || null;

        // Detect price changes
        const prev = existingMap.get(sku);
        if (prev && prev.price != null && unitPrice != null && Math.abs(prev.price - unitPrice) > 0.001) {
          priceChanges.push({
            sku,
            name: d.name || prev.name || sku,
            oldPrice: prev.price,
            newPrice: unitPrice,
          });
        }

        upsertRows.push({
          distributor_id: ctx.distributorId,
          sku,
          name: d.name || sku,
          brand: d.brand || null,
          pack_size: d.pack_size || null,
          unit: d.unit || null,
          unit_price: unitPrice,
          price_effective_date: new Date().toISOString().split("T")[0],
          category: d.category || null,
          is_active: true,
          raw_data: row._raw,
          updated_at: new Date().toISOString(),
        });
      }

      if (upsertRows.length > 0) {
        const { error } = await supabase
          .from("distributor_products")
          .upsert(upsertRows, { onConflict: "distributor_id,sku" });

        if (error) {
          errors.push({ sku: `batch ${Math.floor(i / batchSize) + 1}`, error: error.message });
        } else {
          upserted += upsertRows.length;
        }
      }
    }

    // Deactivate products not in the import (only if this looks like a full catalog)
    let deactivated = 0;
    if (rows.length > 10) {
      const skusToDeactivate = [...existingMap.keys()].filter((sku) => !skusSeen.has(sku));
      if (skusToDeactivate.length > 0 && skusToDeactivate.length < existingMap.size * 0.5) {
        // Only deactivate if less than 50% would be removed (safety check)
        const { count } = await supabase
          .from("distributor_products")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("distributor_id", ctx.distributorId)
          .in("sku", skusToDeactivate);
        deactivated = count ?? 0;
      }
    }

    return { productsUpserted: upserted, productsDeactivated: deactivated, priceChanges, errors };
  }

  async importInvoices(
    ctx: ConnectorContext,
    input: ConnectorInput
  ): Promise<InvoiceImportResult> {
    const config = ctx.config as PFGConfig;
    let fileBuffer: Buffer;

    switch (input.transport) {
      case "file_upload":
      case "manual_csv":
        fileBuffer = input.fileBuffer;
        break;
      case "edi":
        fileBuffer = Buffer.from(input.rawData);
        break;
      default:
        throw new Error(`Unsupported transport for PFG invoice import: ${input.transport}`);
    }

    const columnMapping = {
      ...DEFAULT_INVOICE_COLUMNS,
      ...(config.invoice_columns || {}),
    };

    const { rows } = parseCsv(fileBuffer, {
      columnMapping,
      skipEmptyRows: true,
      trimValues: true,
    });

    if (rows.length === 0) {
      return { invoicesCreated: 0, invoicesUpdated: 0, creditsCreated: 0, lineItems: 0, errors: [] };
    }

    const supabase = await createClient();
    const errors: InvoiceImportResult["errors"] = [];

    // Group rows by invoice number
    const invoiceGroups = new Map<string, typeof rows>();
    for (const row of rows) {
      const invoiceNum = row.data.invoice_number;
      if (!invoiceNum) continue;
      if (!invoiceGroups.has(invoiceNum)) invoiceGroups.set(invoiceNum, []);
      invoiceGroups.get(invoiceNum)!.push(row);
    }

    let invoicesCreated = 0;
    let invoicesUpdated = 0;
    let totalLineItems = 0;

    for (const [invoiceNumber, lines] of invoiceGroups) {
      // Calculate totals
      let subtotal = 0;
      const lineItems = lines.map((line) => {
        const d = line.data;
        const extPrice = parseFloat(d.extended_price) || (parseFloat(d.unit_price) || 0) * (parseFloat(d.quantity) || 0);
        subtotal += extPrice;
        return {
          sku: d.sku || "",
          product_name: d.product_name || d.sku || "",
          quantity: parseFloat(d.quantity) || 0,
          unit_price: parseFloat(d.unit_price) || 0,
          extended_price: extPrice,
        };
      });

      // Check if invoice already exists
      const { data: existing } = await supabase
        .from("distributor_invoices")
        .select("id")
        .eq("distributor_id", ctx.distributorId)
        .eq("invoice_number", invoiceNumber)
        .maybeSingle();

      if (existing) {
        invoicesUpdated++;
        continue; // Skip duplicates — idempotent
      }

      // Create invoice
      const invoiceDate = lines[0].data.invoice_date || new Date().toISOString().split("T")[0];
      const { data: invoice, error: invError } = await supabase
        .from("distributor_invoices")
        .insert({
          organization_id: ctx.organizationId,
          user_id: ctx.userId,
          distributor_id: ctx.distributorId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: lines[0].data.due_date || null,
          subtotal,
          tax: 0,
          total: subtotal,
          status: "pending",
          raw_data: { lines: lines.map((l) => l._raw) },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (invError) {
        errors.push({ ref: invoiceNumber, error: invError.message });
        continue;
      }

      // Create invoice line items
      const invoiceLines = lineItems.map((item) => ({
        invoice_id: invoice.id,
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        extended_price: item.extended_price,
        variance_flag: false,
      }));

      const { error: lineError } = await supabase
        .from("distributor_invoice_lines")
        .insert(invoiceLines);

      if (lineError) {
        errors.push({ ref: invoiceNumber, error: `Lines: ${lineError.message}` });
      }

      invoicesCreated++;
      totalLineItems += lineItems.length;
    }

    return {
      invoicesCreated,
      invoicesUpdated,
      creditsCreated: 0,
      lineItems: totalLineItems,
      errors,
    };
  }

  async validateConfig(ctx: ConnectorContext): Promise<{ valid: boolean; error?: string }> {
    const config = ctx.config as PFGConfig;

    // For file-based transport, just verify the config structure
    if (!config) {
      return { valid: true }; // Minimal config OK for file upload
    }

    if (config.sftp) {
      if (!config.sftp.host || !config.sftp.username) {
        return { valid: false, error: "SFTP config requires host and username" };
      }
      // Future: test SFTP connection
    }

    return { valid: true };
  }
}
