// Gusto Embedded OAuth 2.0 Flow
//
// Gusto uses standard OAuth 2.0 with authorization code grant.
// Access tokens expire in 2 hours, refresh tokens are long-lived.
// We store one connection per user/org.

import { createClient } from "@/lib/supabase/server";
import type { PayrollConnection, PayrollTokenResponse } from "./types";

const GUSTO_AUTH_URL = "https://api.gusto-demo.com/oauth/authorize"; // demo env
const GUSTO_TOKEN_URL = "https://api.gusto-demo.com/oauth/token";
// Production URLs:
// const GUSTO_AUTH_URL = "https://api.gusto.com/oauth/authorize";
// const GUSTO_TOKEN_URL = "https://api.gusto.com/oauth/token";

function getGustoBaseUrl(): string {
  return process.env.GUSTO_ENV === "production"
    ? "https://api.gusto.com"
    : "https://api.gusto-demo.com";
}

function getAuthUrl(): string {
  return `${getGustoBaseUrl()}/oauth/authorize`;
}

function getTokenUrl(): string {
  return `${getGustoBaseUrl()}/oauth/token`;
}

function getClientId(): string {
  const id = process.env.GUSTO_CLIENT_ID;
  if (!id) throw new Error("GUSTO_CLIENT_ID is not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GUSTO_CLIENT_SECRET;
  if (!secret) throw new Error("GUSTO_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/payroll/callback`;
}

/**
 * Generate the Gusto OAuth authorization URL.
 */
export function getAuthorizationUrl(userId: string): string {
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
  });

  return `${getAuthUrl()}?${params.toString()}`;
}

/**
 * Parse and validate the state parameter.
 */
export function parseState(state: string): { userId: string; ts: number } | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    if (!decoded.userId || !decoded.ts) return null;
    if (Date.now() - decoded.ts > 10 * 60 * 1000) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCode(code: string): Promise<PayrollTokenResponse> {
  const res = await fetch(getTokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gusto token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<PayrollTokenResponse> {
  const res = await fetch(getTokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gusto token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}

// ─── Connection Storage ───

export async function saveConnection(params: {
  userId: string;
  orgId: string | null;
  companyUuid: string;
  tokens: PayrollTokenResponse;
  companyName?: string;
}): Promise<PayrollConnection> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + params.tokens.expires_in * 1000).toISOString();

  const { data, error } = await supabase
    .from("payroll_connections")
    .upsert(
      {
        user_id: params.userId,
        organization_id: params.orgId,
        provider: "gusto",
        company_uuid: params.companyUuid,
        access_token: params.tokens.access_token,
        refresh_token: params.tokens.refresh_token,
        token_expires_at: expiresAt,
        company_name: params.companyName || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to save payroll connection: ${error.message}`);
  return data as PayrollConnection;
}

export async function getConnection(
  userId: string,
  orgId: string | null
): Promise<PayrollConnection | null> {
  const supabase = await createClient();
  let q = supabase
    .from("payroll_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (orgId) q = q.eq("organization_id", orgId);

  const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data as PayrollConnection | null;
}

export async function getValidToken(
  userId: string,
  orgId: string | null
): Promise<{ accessToken: string; companyUuid: string } | null> {
  const conn = await getConnection(userId, orgId);
  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at);
  const now = new Date();

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(conn.refresh_token);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      const supabase = await createClient();
      await supabase
        .from("payroll_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      return { accessToken: newTokens.access_token, companyUuid: conn.company_uuid };
    } catch (err) {
      console.error("[payroll/auth] Token refresh failed:", err);
      const supabase = await createClient();
      await supabase
        .from("payroll_connections")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      return null;
    }
  }

  return { accessToken: conn.access_token, companyUuid: conn.company_uuid };
}

export async function disconnect(userId: string, orgId: string | null): Promise<void> {
  const conn = await getConnection(userId, orgId);
  if (!conn) return;

  const supabase = await createClient();
  await supabase
    .from("payroll_connections")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", conn.id);
}
