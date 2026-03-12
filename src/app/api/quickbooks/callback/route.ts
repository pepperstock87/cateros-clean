import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { parseState, exchangeCode, saveConnection } from "@/lib/quickbooks/auth";
import { QuickBooksClient } from "@/lib/quickbooks/client";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${appUrl}/settings?qb_error=${encodeURIComponent("QuickBooks connection was denied")}`
    );
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      `${appUrl}/settings?qb_error=${encodeURIComponent("Missing required parameters")}`
    );
  }

  // Validate state
  const stateData = parseState(state);
  if (!stateData) {
    return NextResponse.redirect(
      `${appUrl}/settings?qb_error=${encodeURIComponent("Invalid or expired state")}`
    );
  }

  // Verify the authenticated user matches the state
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateData.userId) {
    return NextResponse.redirect(
      `${appUrl}/settings?qb_error=${encodeURIComponent("Authentication mismatch")}`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Get company info
    const qb = new QuickBooksClient(tokens.access_token, realmId);
    let companyName: string | undefined;
    try {
      const info = await qb.getCompanyInfo();
      companyName = info.CompanyName;
    } catch {
      // Company name is nice-to-have
    }

    // Save connection
    const org = await getCurrentOrg();
    await saveConnection({
      userId: user.id,
      orgId: org?.orgId || null,
      realmId,
      tokens,
      companyName,
    });

    // Audit log
    logAudit({
      userId: user.id,
      action: "create",
      entity: "payment",
      entityId: realmId,
      entityName: `QuickBooks: ${companyName || realmId}`,
      details: { integration: "quickbooks", action: "connected" },
      organizationId: org?.orgId || null,
    });

    return NextResponse.redirect(
      `${appUrl}/settings?qb_success=${encodeURIComponent(companyName || "QuickBooks connected")}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    console.error("[quickbooks/callback] Error:", message);
    return NextResponse.redirect(
      `${appUrl}/settings?qb_error=${encodeURIComponent(message)}`
    );
  }
}
