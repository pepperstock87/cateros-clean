// QuickBooks OAuth 2.0 Flow
//
// QBO uses standard OAuth 2.0 with authorization code grant.
// Tokens are stored in qb_connections table per user/org.
// Access tokens expire in 1 hour, refresh tokens in 100 days.

import { createClient } from "@/lib/supabase/server";
import type { QBConnection, QBTokenResponse } from "./types";

const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

function getClientId(): string {
  const id = process.env.QBO_CLIENT_ID;
  if (!id) throw new Error("QBO_CLIENT_ID is not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.QBO_CLIENT_SECRET;
  if (!secret) throw new Error("QBO_CLIENT_SECRET is not configured");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/quickbooks/callback`;
}

/**
 * Generate the QBO OAuth authorization URL.
 * The state param encodes userId for CSRF protection.
 */
export function getAuthorizationUrl(userId: string): string {
  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });

  return `${QBO_AUTH_URL}?${params.toString()}`;
}

/**
 * Parse and validate the state parameter from the callback.
 */
export function parseState(state: string): { userId: string; ts: number } | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    if (!decoded.userId || !decoded.ts) return null;
    // Reject states older than 10 minutes
    if (Date.now() - decoded.ts > 10 * 60 * 1000) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<QBTokenResponse> {
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QBO token exchange failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<QBTokenResponse> {
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QBO token refresh failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Revoke tokens when disconnecting.
 */
export async function revokeToken(token: string): Promise<void> {
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");

  await fetch(QBO_REVOKE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ token }),
  });
}

// ─── Connection Storage ───

/**
 * Store or update a QBO connection after successful OAuth.
 */
export async function saveConnection(params: {
  userId: string;
  orgId: string | null;
  realmId: string;
  tokens: QBTokenResponse;
  companyName?: string;
}): Promise<QBConnection> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + params.tokens.expires_in * 1000).toISOString();

  const { data, error } = await supabase
    .from("qb_connections")
    .upsert(
      {
        user_id: params.userId,
        organization_id: params.orgId,
        realm_id: params.realmId,
        access_token: params.tokens.access_token,
        refresh_token: params.tokens.refresh_token,
        token_expires_at: expiresAt,
        company_name: params.companyName || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,realm_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to save QBO connection: ${error.message}`);
  return data as QBConnection;
}

/**
 * Get the active QBO connection for a user/org.
 */
export async function getConnection(
  userId: string,
  orgId: string | null
): Promise<QBConnection | null> {
  const supabase = await createClient();
  let q = supabase
    .from("qb_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (orgId) q = q.eq("organization_id", orgId);

  const { data } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data as QBConnection | null;
}

/**
 * Get a valid access token, refreshing if expired.
 * Returns the token and realm_id, or null if no connection.
 */
export async function getValidToken(
  userId: string,
  orgId: string | null
): Promise<{ accessToken: string; realmId: string } | null> {
  const conn = await getConnection(userId, orgId);
  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(conn.refresh_token);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      const supabase = await createClient();
      await supabase
        .from("qb_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);

      return { accessToken: newTokens.access_token, realmId: conn.realm_id };
    } catch (err) {
      console.error("[quickbooks/auth] Token refresh failed:", err);
      // Mark connection as inactive if refresh fails
      const supabase = await createClient();
      await supabase
        .from("qb_connections")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      return null;
    }
  }

  return { accessToken: conn.access_token, realmId: conn.realm_id };
}

/**
 * Disconnect QBO — revoke tokens and deactivate.
 */
export async function disconnect(userId: string, orgId: string | null): Promise<void> {
  const conn = await getConnection(userId, orgId);
  if (!conn) return;

  // Revoke token (best-effort)
  try {
    await revokeToken(conn.refresh_token);
  } catch {
    // Revocation failure shouldn't block disconnect
  }

  const supabase = await createClient();
  await supabase
    .from("qb_connections")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", conn.id);
}
