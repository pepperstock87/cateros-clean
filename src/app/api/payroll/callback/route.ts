import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/organizations";
import { parseState, exchangeCode, saveConnection } from "@/lib/payroll/auth";
import { GustoClient } from "@/lib/payroll/client";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?payroll_error=${encodeURIComponent("Missing required parameters")}`
    );
  }

  const stateData = parseState(state);
  if (!stateData) {
    return NextResponse.redirect(
      `${appUrl}/settings?payroll_error=${encodeURIComponent("Invalid or expired state")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== stateData.userId) {
    return NextResponse.redirect(
      `${appUrl}/settings?payroll_error=${encodeURIComponent("Authentication mismatch")}`
    );
  }

  try {
    const tokens = await exchangeCode(code);

    // Get company info from Gusto
    // The token response includes the company UUID in a different way for Gusto Embedded
    // For now, fetch the current user's companies
    const tempClient = new GustoClient(tokens.access_token, "");
    let companyUuid = "";
    let companyName = "";

    try {
      // Gusto Embedded: the token is scoped to a company
      // Use the /v1/me endpoint to get the current user's company
      const res = await fetch(
        `${process.env.GUSTO_ENV === "production" ? "https://api.gusto.com" : "https://api.gusto-demo.com"}/v1/me`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const me = await res.json();
        if (me.roles?.payroll_admin?.companies?.[0]) {
          const company = me.roles.payroll_admin.companies[0];
          companyUuid = company.uuid;
          companyName = company.name || "";
        }
      }
    } catch {
      // Fall back — company UUID may come from the OAuth flow
    }

    if (!companyUuid) {
      return NextResponse.redirect(
        `${appUrl}/settings?payroll_error=${encodeURIComponent("Could not determine Gusto company")}`
      );
    }

    const org = await getCurrentOrg();
    await saveConnection({
      userId: user.id,
      orgId: org?.orgId || null,
      companyUuid,
      tokens,
      companyName,
    });

    logAudit({
      userId: user.id,
      action: "create",
      entity: "staff",
      entityId: companyUuid,
      entityName: `Gusto: ${companyName || companyUuid}`,
      details: { integration: "gusto", action: "connected" },
      organizationId: org?.orgId || null,
    });

    return NextResponse.redirect(
      `${appUrl}/settings?payroll_success=${encodeURIComponent(companyName || "Gusto connected")}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    console.error("[payroll/callback] Error:", message);
    return NextResponse.redirect(
      `${appUrl}/settings?payroll_error=${encodeURIComponent(message)}`
    );
  }
}
