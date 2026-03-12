import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { createSyncJob, processSyncJob } from "@/lib/distributors/sync";
import { registerDomainEventHandlers } from "@/lib/events";
import crypto from "crypto";

registerDomainEventHandlers();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const distributorId = formData.get("distributorId") as string;
    const jobType = formData.get("jobType") as string;

    if (!file || !distributorId || !jobType) {
      return NextResponse.json(
        { error: "file, distributorId, and jobType are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "text/plain",
      "text/tab-separated-values",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|tsv|txt|xls|xlsx)$/i)) {
      return NextResponse.json(
        { error: "Only CSV, TSV, TXT, and Excel files are supported" },
        { status: 400 }
      );
    }

    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size limit is 10MB" }, { status: 400 });
    }

    const org = await getCurrentOrg();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate idempotency key from file hash + distributor + type
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex").slice(0, 16);
    const idempotencyKey = `${jobType}-${distributorId}-${fileHash}`;

    // Verify the distributor belongs to this user
    const { data: distributor } = await supabase
      .from("distributors")
      .select("id, transport")
      .eq("id", distributorId)
      .eq("user_id", user.id)
      .single();

    if (!distributor) {
      return NextResponse.json({ error: "Distributor not found" }, { status: 404 });
    }

    // Create sync job
    const jobResult = await createSyncJob({
      organizationId: org?.orgId || null,
      userId: user.id,
      distributorId,
      jobType: jobType as any,
      transport: "file_upload",
      idempotencyKey,
      inputData: {
        filename: file.name,
        fileSize: file.size,
        fileHash,
        fileBuffer: fileBuffer.toString("base64"), // Store in job for processing
      },
    });

    if ("error" in jobResult) {
      return NextResponse.json({ error: jobResult.error }, { status: 500 });
    }

    if (!jobResult.isExisting) {
      // Process the job immediately (don't wait for cron)
      // Override the connector input with the actual file buffer
      // The sync engine will handle this
      try {
        // Inline processing for file uploads
        const { getConnector } = await import("@/lib/distributors/registry");
        const { data: dist } = await supabase
          .from("distributors")
          .select("*")
          .eq("id", distributorId)
          .single();

        if (dist) {
          const connector = getConnector(dist.connector_type);
          if (connector) {
            const ctx = {
              organizationId: org?.orgId || null,
              userId: user.id,
              distributorId,
              config: dist.config || {},
            };

            if (jobType === "catalog_import" || jobType === "price_update") {
              const result = await connector.importCatalog(ctx, {
                transport: "file_upload",
                fileBuffer,
                filename: file.name,
              });

              // Mark job completed
              await supabase
                .from("distributor_sync_jobs")
                .update({
                  status: "completed",
                  result: result as unknown as Record<string, unknown>,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", jobResult.id);

              await supabase
                .from("distributors")
                .update({ last_synced_at: new Date().toISOString() })
                .eq("id", distributorId);

              return NextResponse.json({
                success: true,
                jobId: jobResult.id,
                result,
              });
            }

            if (jobType === "invoice_import" && connector.importInvoices) {
              const result = await connector.importInvoices(ctx, {
                transport: "file_upload",
                fileBuffer,
                filename: file.name,
              });

              await supabase
                .from("distributor_sync_jobs")
                .update({
                  status: "completed",
                  result: result as unknown as Record<string, unknown>,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", jobResult.id);

              return NextResponse.json({
                success: true,
                jobId: jobResult.id,
                result,
              });
            }
          }
        }
      } catch (err) {
        // If inline processing fails, the job is still queued for retry
        console.error("[distributors/upload] Inline processing failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      jobId: jobResult.id,
      isExisting: jobResult.isExisting,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
