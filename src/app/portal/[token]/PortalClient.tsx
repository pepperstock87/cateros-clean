"use client";

import { useState, useRef, useEffect } from "react";
import { Event, Proposal, BusinessSettings } from "@/types";
import styles from "./portal.module.css";

interface PortalMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  cainAnalysis?: Record<string, unknown> | null;
  approvalStatus?: string;
}

interface TokenData {
  id: string;
  userId: string;
  orgId: string | null;
  eventId: string;
  clientId: string | null;
  clientEmail: string | null;
  permissions: Record<string, boolean>;
  lastAccessedAt: string | null;
}

interface PortalClientProps {
  token: string;
  event: Event;
  proposal: Proposal | null;
  messages: PortalMessage[];
  branding: BusinessSettings | null;
  tokenData: TokenData;
}

export default function PortalClient({
  token,
  event,
  proposal,
  messages: initialMessages,
  branding,
  tokenData,
}: PortalClientProps) {
  const [messages, setMessages] = useState<PortalMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "messages">("details");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/portal/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      const newMsg: PortalMessage = {
        id: data.id,
        sender: "client",
        content: newMessage,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      setMessages([...messages, newMsg]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const brandColor = branding?.brand_color || "#059669";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            {branding?.logo_url && (
              <img
                src={branding.logo_url}
                alt={branding.business_name || "Caterer"}
                style={{ height: "32px", marginBottom: "8px" }}
              />
            )}
            <h1 style={{ margin: "0", fontSize: "24px", color: "#111827" }}>
              {event.name}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6b7280" }}>
              {formatDate(event.event_date)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-block",
                paddingLeft: "16px",
                borderLeft: "1px solid #e5e7eb",
              }}
            >
              <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
                Contact
              </p>
              {event.client_email && (
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#111827" }}>
                  {event.client_email}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 400px",
            gap: "24px",
          }}
        >
          {/* Left Column - Details & Messages */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <button
                onClick={() => setActiveTab("details")}
                style={{
                  padding: "8px 0",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: activeTab === "details" ? brandColor : "#6b7280",
                  borderBottom:
                    activeTab === "details"
                      ? `2px solid ${brandColor}`
                      : "2px solid transparent",
                }}
              >
                Event Details
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                style={{
                  padding: "8px 0",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: activeTab === "messages" ? brandColor : "#6b7280",
                  borderBottom:
                    activeTab === "messages"
                      ? `2px solid ${brandColor}`
                      : "2px solid transparent",
                }}
              >
                Messages
              </button>
            </div>

            {/* Details Tab */}
            {activeTab === "details" && (
              <div>
                {/* Event Summary Card */}
                <div
                  style={{
                    backgroundColor: "white",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    marginBottom: "24px",
                  }}
                >
                  <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
                    Event Details
                  </h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                        Date
                      </p>
                      <p style={{ margin: "0", fontSize: "16px", color: "#111827" }}>
                        {formatDate(event.event_date)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                        Time
                      </p>
                      <p style={{ margin: "0", fontSize: "16px", color: "#111827" }}>
                        {event.start_time && event.end_time
                          ? `${event.start_time} - ${event.end_time}`
                          : event.start_time
                          ? event.start_time
                          : "TBD"}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                        Guest Count
                      </p>
                      <p style={{ margin: "0", fontSize: "16px", color: "#111827" }}>
                        {event.guest_count}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                        Status
                      </p>
                      <p
                        style={{
                          margin: "0",
                          fontSize: "16px",
                          color: "#111827",
                          textTransform: "capitalize",
                        }}
                      >
                        {event.status}
                      </p>
                    </div>
                    {event.venue && (
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                          Venue
                        </p>
                        <p style={{ margin: "0", fontSize: "16px", color: "#111827" }}>
                          {event.venue}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposal Card */}
                {proposal && (
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "24px",
                      borderRadius: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
                      Proposal
                    </h2>
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>
                          Status
                        </p>
                        <p
                          style={{
                            margin: "0",
                            fontSize: "16px",
                            color: "#111827",
                            textTransform: "capitalize",
                          }}
                        >
                          {proposal.status}
                        </p>
                      </div>
                      {proposal.pdf_url && (
                        <a
                          href={proposal.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "8px 16px",
                            backgroundColor: brandColor,
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            width: "fit-content",
                          }}
                        >
                          View Proposal PDF
                        </a>
                      )}
                      {proposal.viewed_at && (
                        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>
                          Viewed on {formatDate(proposal.viewed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === "messages" && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  height: "500px",
                }}
              >
                {/* Messages List */}
                <div
                  style={{
                    flex: "1",
                    overflowY: "auto",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {messages.length === 0 ? (
                    <p style={{ color: "#6b7280", textAlign: "center", margin: "auto" }}>
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: msg.sender === "client" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            backgroundColor:
                              msg.sender === "client" ? brandColor : "#e5e7eb",
                            color: msg.sender === "client" ? "white" : "#111827",
                          }}
                        >
                          <p style={{ margin: "0 0 4px", fontSize: "14px" }}>
                            {msg.content}
                          </p>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "12px",
                              opacity: 0.7,
                            }}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      fontSize: "14px",
                      borderTop: "1px solid #fca5a5",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Message Input */}
                {tokenData.permissions.send_messages && (
                  <div
                    style={{
                      padding: "16px 24px",
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      disabled={isLoading}
                      style={{
                        flex: "1",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !newMessage.trim()}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: brandColor,
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        opacity: isLoading || !newMessage.trim() ? 0.5 : 1,
                      }}
                    >
                      {isLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Quick Info */}
          <div>
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#111827" }}>
                Quick Info
              </h3>

              <div style={{ display: "grid", gap: "16px" }}>
                {event.client_name && (
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280" }}>
                      Client Name
                    </p>
                    <p style={{ margin: "0", fontSize: "14px", color: "#111827" }}>
                      {event.client_name}
                    </p>
                  </div>
                )}

                {event.client_phone && (
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280" }}>
                      Phone
                    </p>
                    <p style={{ margin: "0", fontSize: "14px", color: "#111827" }}>
                      {event.client_phone}
                    </p>
                  </div>
                )}

                {event.notes && (
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280" }}>
                      Notes
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "14px",
                        color: "#111827",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {event.notes}
                    </p>
                  </div>
                )}

                {branding?.business_name && (
                  <div
                    style={{
                      paddingTop: "12px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280" }}>
                      Organized by
                    </p>
                    <p style={{ margin: "0", fontSize: "14px", color: "#111827" }}>
                      {branding.business_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
