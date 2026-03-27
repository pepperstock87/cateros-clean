"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types";

interface PortalToken {
  id: string;
  clientEmail: string | null;
  isActive: boolean;
  lastAccessedAt: string | null;
  createdAt: string;
}

interface PortalTokenManagerProps {
  event: Event;
  userId: string;
  onTokenCreated?: (token: string, url: string) => void;
}

export function PortalTokenManager({
  event,
  userId,
  onTokenCreated,
}: PortalTokenManagerProps) {
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch tokens on mount
  useEffect(() => {
    fetchTokens();
  }, [event.id]);

  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/portal/tokens?eventId=${event.id}`);
      if (!response.ok) throw new Error("Failed to fetch tokens");
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateToken = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/portal/tokens/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          clientEmail: event.client_email,
          clientName: event.client_name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create token");
      }

      const data = await response.json();
      const { token, portalUrl } = data;

      // Refresh token list
      await fetchTokens();

      // Callback
      if (onTokenCreated) {
        onTokenCreated(token, portalUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate token");
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/portal/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to revoke token");
      }

      setTokens(tokens.filter((t) => t.id !== tokenId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: "18px",
          fontWeight: "600",
          color: "#111827",
        }}
      >
        Client Portal Access
      </h3>

      <p
        style={{
          margin: "0 0 16px",
          fontSize: "14px",
          color: "#6b7280",
        }}
      >
        Generate secure links for clients to view event details and communicate
        with you.
      </p>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateToken}
        disabled={isGenerating}
        style={{
          padding: "10px 16px",
          backgroundColor: "#059669",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
          marginBottom: "24px",
          opacity: isGenerating ? 0.7 : 1,
        }}
      >
        {isGenerating ? "Generating..." : "Generate New Portal Link"}
      </button>

      {/* Tokens List */}
      {isLoading ? (
        <p style={{ color: "#6b7280" }}>Loading tokens...</p>
      ) : tokens.length === 0 ? (
        <p style={{ color: "#6b7280" }}>
          No portal links created yet. Generate one above.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {tokens.map((token) => (
            <div
              key={token.id}
              style={{
                padding: "12px",
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    {token.clientEmail || "No email provided"}
                  </p>
                  <p
                    style={{
                      margin: "0",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    Created {formatDate(token.createdAt)}
                    {token.lastAccessedAt && ` • Last accessed ${formatDate(token.lastAccessedAt)}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token.id}`,
                        token.id
                      )
                    }
                    style={{
                      padding: "6px 12px",
                      backgroundColor: copied === token.id ? "#10b981" : "#e5e7eb",
                      color: copied === token.id ? "white" : "#111827",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}
                  >
                    {copied === token.id ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => revokeToken(token.id)}
                    disabled={!token.isActive}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: token.isActive ? "#ef4444" : "#d1d5db",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: token.isActive ? "pointer" : "default",
                      fontSize: "12px",
                      fontWeight: "500",
                      opacity: token.isActive ? 1 : 0.5,
                    }}
                  >
                    {token.isActive ? "Revoke" : "Revoked"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
