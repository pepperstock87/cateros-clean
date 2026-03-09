"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, FileText, CreditCard, Eye, CheckCircle, XCircle, BookOpen, RotateCcw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

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
      return <Eye className="w-3.5 h-3.5 text-blue-400" />;
    case "proposal_approved":
    case "proposal_accepted":
    case "proposal_signed":
    case "proposal_booked":
      return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    case "proposal_declined":
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case "revision_requested":
      return <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />;
    case "payment_received":
      return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <FileText className="w-3.5 h-3.5 text-[#7A8BA8]" />;
  }
}

export function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markOneRead(n.id);
    if (n.link_url) {
      window.location.href = n.link_url;
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? "Notifications" : undefined}
        className={cn(
          "flex items-center rounded-lg text-sm text-[#D4A373] hover:text-[#F4F1ED] hover:bg-[#1A2538] transition-all",
          collapsed ? "justify-center px-0 py-2.5 w-full" : "gap-2.5 px-3 py-2.5 w-full"
        )}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {!collapsed && "Notifications"}
      </button>

      {open && (
        <div className={cn(
          "absolute bottom-full mb-2 w-80 bg-[#182030] border border-[#2A3A5C] rounded-xl shadow-2xl z-50 overflow-hidden",
          collapsed ? "left-full ml-2 bottom-0 mb-0" : "left-0"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3A5C]">
            <h3 className="text-sm font-semibold text-[#F4F1ED]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#7A8BA8]">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-[#1F2A44] transition-colors border-l-2",
                    n.read
                      ? "border-l-transparent"
                      : "border-l-brand-400 bg-[#1e1a15]"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {notificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            n.read ? "text-[#7A8BA8]" : "text-[#F4F1ED] font-medium"
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="text-[#5A6A88] text-[11px] whitespace-nowrap flex-shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.message && (
                        <p className={cn(
                          "text-xs mt-1 line-clamp-2",
                          n.read ? "text-[#5A6A88]" : "text-[#7A8BA8]"
                        )}>
                          {n.message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#2A3A5C] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
