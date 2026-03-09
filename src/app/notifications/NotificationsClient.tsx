"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  CreditCard,
  FileText,
  RotateCcw,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from "@/lib/actions/notifications";
import type { Notification } from "@/types";

type FilterMode = "all" | "unread";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function notificationIcon(type: string) {
  switch (type) {
    case "proposal_viewed":
      return <Eye className="w-4 h-4 text-blue-400" />;
    case "proposal_approved":
    case "proposal_accepted":
    case "proposal_signed":
    case "proposal_booked":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "proposal_declined":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "revision_requested":
      return <RotateCcw className="w-4 h-4 text-yellow-400" />;
    case "payment_received":
      return <CreditCard className="w-4 h-4 text-emerald-400" />;
    default:
      return <FileText className="w-4 h-4 text-[#7A8BA8]" />;
  }
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (n: Notification) => {
    if (!n.read) {
      startTransition(async () => {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
      });
    }
    if (n.link_url) {
      router.push(n.link_url);
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  const handleClearRead = () => {
    startTransition(async () => {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.read));
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center">
            <Bell className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#7A8BA8]">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-950/50 hover:bg-brand-950 border border-brand-800/40 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          {notifications.some((n) => n.read) && (
            <button
              onClick={handleClearRead}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#7A8BA8] hover:text-red-400 bg-[#1A2538] hover:bg-red-900/20 border border-[#2A3A5C] rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-[#0C1220] border border-[#2A3A5C] rounded-lg p-1 w-fit">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            filter === "all"
              ? "bg-[#1A2538] text-[#F4F1ED]"
              : "text-[#7A8BA8] hover:text-[#F4F1ED]"
          )}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            filter === "unread"
              ? "bg-[#1A2538] text-[#F4F1ED]"
              : "text-[#7A8BA8] hover:text-[#F4F1ED]"
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-[#1A2538] flex items-center justify-center mx-auto mb-4">
              <Bell className="w-6 h-6 text-[#5A6A88]" />
            </div>
            <p className="text-[#7A8BA8] text-sm">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            <p className="text-[#5A6A88] text-xs mt-1">
              {filter === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here when you receive them."}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "w-full text-left px-4 py-4 rounded-lg border transition-colors group",
                n.read
                  ? "border-[#2A3A5C]/50 bg-[#0C1220]/50 hover:bg-[#1A2538]/50"
                  : "border-brand-800/30 bg-[#1e1a15] hover:bg-[#252015]"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  n.read ? "bg-[#1A2538]" : "bg-brand-950/50"
                )}>
                  {notificationIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        n.read
                          ? "text-[#7A8BA8]"
                          : "text-[#F4F1ED] font-medium"
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="text-[#5A6A88] text-xs whitespace-nowrap flex-shrink-0 mt-0.5">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.message && (
                    <p
                      className={cn(
                        "text-xs mt-1 leading-relaxed",
                        n.read ? "text-[#5A6A88]" : "text-[#7A8BA8]"
                      )}
                    >
                      {n.message}
                    </p>
                  )}
                  {n.link_url && (
                    <p className="text-xs text-brand-400/60 mt-1.5 group-hover:text-brand-400 transition-colors">
                      Click to view details
                    </p>
                  )}
                </div>
                {!n.read && (
                  <div className="mt-2 w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
