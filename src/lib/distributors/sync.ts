// Sync Job Orchestrator
//
// Creates, processes, and retries distributor sync jobs.
// All ingest operations go through sync jobs for idempotency,
// auditability, and retry safety.

import { createClient } from "@/lib/supabase/server";
import { domainEvents } from "@/lib/events";
import { getConnector } from "./registry";
import type {
  SyncJobType,
  DistributorTransport,
  DistributorSyncJob,
  ConnectorInput,
  ConnectorType,
} from "./types";
import type { ConnectorContext } from "./connector";

const MAX_ATTEMPTS = 5;

/**
 * Create a new sync job. Returns existing job if idempotency key matches.
 */
export async function createSyncJob(params: {
  organizationId: string | null;
  userId: string;
  distributorId: string;
  jobType: SyncJobType;
  transport: DistributorTransport;
  idempotencyKey: string;
  inputFileUrl?: string;
  inputData?: Record<string, unknown>;
}): Promise<{ id: string; isExisting: boolean } | { error: string }> {
  const supabase = await createClient();

  // Check for existing job with same idempotency key
  const { data: existing } = await supabase
    .from("distributor_sync_jobs")
    .select("id, status")
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, isExisting: true };
  }

  const { data, error } = await supabase
    .from("distributor_sync_jobs")
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      distributor_id: params.distributorId,
      job_type: params.jobType,
      transport: params.transport,
      status: "queued",
      idempotency_key: params.idempotencyKey,
      input_file_url: params.inputFileUrl || null,
      input_data: params.inputData || null,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id, isExisting: false };
}

/**
 * Process a single sync job.
 */
export async function processSyncJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  // Load job
  const { data: job } = await supabase
    .from("distributor_sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error(`Sync job ${jobId} not found`);
  if (job.status === "completed") return; // already done
  if (job.status === "processing") return; // already running

  // Mark as processing
  await supabase
    .from("distributor_sync_jobs")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Load distributor config
  const { data: distributor } = await supabase
    .from("distributors")
    .select("*")
    .eq("id", job.distributor_id)
    .single();

  if (!distributor) {
    await failJob(jobId, "Distributor not found");
    return;
  }

  // Get connector
  const connector = getConnector(distributor.connector_type as ConnectorType);
  if (!connector) {
    await failJob(jobId, `No connector registered for type: ${distributor.connector_type}`);
    return;
  }

  const ctx: ConnectorContext = {
    organizationId: distributor.organization_id,
    userId: job.user_id,
    distributorId: distributor.id,
    config: distributor.config || {},
  };

  try {
    let result: Record<string, unknown> = {};

    // Build connector input from job data
    const input = buildConnectorInput(job);

    switch (job.job_type) {
      case "catalog_import":
      case "price_update": {
        const catalogResult = await connector.importCatalog(ctx, input);
        result = catalogResult as unknown as Record<string, unknown>;

        // Emit domain event
        await domainEvents.emit(
          "distributor.catalog.synced",
          {
            distributorId: distributor.id,
            distributorName: distributor.name,
            orgId: distributor.organization_id,
            userId: job.user_id,
            jobId,
            productsUpserted: catalogResult.productsUpserted,
            priceChanges: catalogResult.priceChanges.length,
          },
          "distributors/sync"
        );

        if (catalogResult.priceChanges.length > 0) {
          await domainEvents.emit(
            "distributor.pricebook.updated",
            {
              distributorId: distributor.id,
              distributorName: distributor.name,
              orgId: distributor.organization_id,
              userId: job.user_id,
              priceChanges: catalogResult.priceChanges,
            },
            "distributors/sync"
          );
        }
        break;
      }

      case "invoice_import": {
        if (!connector.importInvoices) {
          await failJob(jobId, "Connector does not support invoice import");
          return;
        }
        const invoiceResult = await connector.importInvoices(ctx, input);
        result = invoiceResult as unknown as Record<string, unknown>;

        if (invoiceResult.invoicesCreated > 0) {
          await domainEvents.emit(
            "vendor.invoice.received",
            {
              distributorId: distributor.id,
              distributorName: distributor.name,
              orgId: distributor.organization_id,
              userId: job.user_id,
              jobId,
              invoiceCount: invoiceResult.invoicesCreated,
              lineItemCount: invoiceResult.lineItems,
            },
            "distributors/sync"
          );
        }
        break;
      }

      case "order_export": {
        // Order export is handled separately via submitOrder
        result = { message: "Order export handled via submitOrder" };
        break;
      }

      case "delivery_update": {
        // Future implementation
        result = { message: "Delivery updates not yet implemented" };
        break;
      }
    }

    // Mark completed
    await supabase
      .from("distributor_sync_jobs")
      .update({
        status: "completed",
        result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Update distributor last_synced_at
    await supabase
      .from("distributors")
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", distributor.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const attempts = job.attempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      await failJob(jobId, message);

      await domainEvents.emit(
        "vendor.sync.failed",
        {
          distributorId: distributor.id,
          distributorName: distributor.name,
          orgId: distributor.organization_id,
          userId: job.user_id,
          jobId,
          jobType: job.job_type,
          error: message,
          attempts,
        },
        "distributors/sync"
      );
    } else {
      // Queue for retry with exponential backoff
      const backoffMs = Math.pow(5, attempts) * 60 * 1000;
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from("distributor_sync_jobs")
        .update({
          status: "queued",
          error_message: message,
          next_retry_at: nextRetry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  }
}

/**
 * Process all retryable jobs.
 */
export async function processRetryQueue(limit = 10): Promise<number> {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("distributor_sync_jobs")
    .select("id")
    .eq("status", "queued")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (!jobs || jobs.length === 0) return 0;

  let processed = 0;
  for (const job of jobs) {
    try {
      await processSyncJob(job.id);
      processed++;
    } catch (err) {
      console.error(`[distributors/sync] Failed to process retry job ${job.id}:`, err);
    }
  }

  return processed;
}

/**
 * Get recent sync jobs for UI display.
 */
export async function getRecentSyncJobs(params: {
  userId: string;
  orgId: string | null;
  distributorId?: string;
  limit?: number;
}): Promise<DistributorSyncJob[]> {
  const supabase = await createClient();
  let q = supabase
    .from("distributor_sync_jobs")
    .select("*")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 20);

  if (params.orgId) q = q.eq("organization_id", params.orgId);
  if (params.distributorId) q = q.eq("distributor_id", params.distributorId);

  const { data } = await q;
  return (data ?? []) as DistributorSyncJob[];
}

// ─── Helpers ───

async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("distributor_sync_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

function buildConnectorInput(job: DistributorSyncJob): ConnectorInput {
  const transport = job.transport as DistributorTransport;

  switch (transport) {
    case "file_upload":
    case "manual_csv":
      // File URL stored in job — the actual buffer must be fetched by the connector
      // We pass the metadata; the connector or caller provides the buffer
      return {
        transport,
        fileBuffer: Buffer.from(""), // placeholder — replaced by caller with actual buffer
        filename: (job.input_data as any)?.filename || "upload.csv",
      };
    case "sftp":
      return {
        transport: "sftp",
        remotePath: (job.input_data as any)?.remotePath,
      };
    case "api":
      return { transport: "api" };
    case "edi":
      return {
        transport: "edi",
        rawData: (job.input_data as any)?.rawData || "",
        ediType: (job.input_data as any)?.ediType,
      };
    default:
      return { transport: "api" };
  }
}
