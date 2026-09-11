"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Bell, 
  Flame, 
  Star, 
  Heart, 
  MessageSquare, 
  CheckCheck, 
  Zap,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { NotificationItem } from "@/types/portfolio";
import { cn, timeAgo } from "@/lib/utils";

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onSimulateIncoming: () => void;
  onSelectPortfolioById: (id: string) => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onSimulateIncoming,
  onSelectPortfolioById,
}: NotificationDropdownProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "showcase" | "engagement">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "showcase") return n.type === "showcase";
    if (filter === "engagement") return n.type === "like" || n.type === "rating" || n.type === "comment";
    return true;
  });

  // Isolate scroll so ONLY the notification list scrolls when cursor is inside dropdown
  useEffect(() => {
    if (!isOpen) return;
    const dropdownEl = dropdownRef.current;
    const listEl = listRef.current;
    if (!dropdownEl || !listEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent background page / document from scrolling
      e.stopPropagation();

      const deltaY = e.deltaY;
      const isDirectlyOnList = e.target && listEl.contains(e.target as Node);

      if (!isDirectlyOnList) {
        // If cursor is on dropdown header/filters/footer, scroll the list directly
        e.preventDefault();
        listEl.scrollTop += deltaY;
        return;
      }

      // Cursor is directly inside the scrollable notification list
      const atTop = listEl.scrollTop <= 0;
      const atBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight <= 1;

      // Lock scroll at top/bottom boundaries to prevent scroll chaining to body
      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };

    dropdownEl.addEventListener("wheel", handleWheel, { passive: false });
    dropdownEl.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      dropdownEl.removeEventListener("wheel", handleWheel);
      dropdownEl.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isOpen, filteredNotifications]);

  if (!isOpen) return null;

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "showcase":
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case "rating":
        return <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />;
      case "like":
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5 text-slate-700" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Mobile backdrop for easy dismissal */}
      <div 
        className="fixed inset-0 z-40 sm:hidden bg-slate-950/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dropdown container */}
      <motion.div
        ref={dropdownRef}
        role="region"
        aria-label="Notifications Dropdown"
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-[62px] left-3 right-3 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2.5 sm:w-[410px] max-w-[calc(100vw-24px)] z-50 bg-white border border-slate-200/95 shadow-2xl rounded-2xl overflow-hidden flex flex-col text-slate-900 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                  Notifications
                </h3>
                {unreadCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                    All caught up
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-mono text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between gap-1 bg-white flex-wrap">
          <div className="flex items-center gap-1">
            {(["all", "unread", "showcase", "engagement"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-mono capitalize transition-all cursor-pointer",
                  filter === mode
                    ? "bg-slate-900 text-white font-medium shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {mode}
                {mode === "unread" && unreadCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold text-amber-300">({unreadCount})</span>
                )}
              </button>
            ))}
          </div>

          {filteredNotifications.length > 5 && (
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-medium">
              5 visible • scrollable
            </span>
          )}
        </div>

        {/* Realtime Simulation Banner */}
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-600 text-[11px] font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Supabase Realtime</span>
          </span>
          <button
            type="button"
            onClick={onSimulateIncoming}
            className="px-2.5 py-1 rounded-full bg-slate-900 text-white font-mono text-[10px] font-semibold hover:bg-black shadow-2xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span>+ Emit Test Event</span>
          </button>
        </div>

        {/* Notifications List (Strictly limited to 5 visible items: 5 * 82px + 4 * 8px gap + 24px padding = 466px, then scrollable) */}
        <div
          ref={listRef}
          style={{ maxHeight: "466px", overscrollBehavior: "contain" }}
          className="overflow-y-auto overscroll-contain p-3 flex flex-col gap-2 scroll-smooth touch-pan-y"
        >
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-mono space-y-1.5">
              <Sparkles className="w-5 h-5 mx-auto text-slate-300" />
              <p>No activity signals found in this filter.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkAsRead(notif.id);
                  if (notif.portfolioId) {
                    onSelectPortfolioById(notif.portfolioId);
                    onClose();
                  }
                }}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer relative group flex items-start gap-2.5 h-[82px] select-none shrink-0",
                  notif.isRead
                    ? "bg-slate-50/70 border-slate-200/60 hover:bg-slate-100/90 hover:border-slate-300"
                    : "bg-amber-50/60 border-amber-200 hover:bg-amber-100/60 hover:border-amber-300 shadow-2xs"
                )}
              >
                {/* Avatar */}
                <img
                  src={notif.actorAvatar}
                  alt={notif.actorName}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0 mt-0.5"
                />

                {/* Text content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                  {/* Top: Name + Type Icon + Timestamp */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {notif.actorName}
                      </span>
                      <span className="shrink-0">{getNotificationIcon(notif.type)}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {timeAgo(notif.timestamp)}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-xs text-slate-600 line-clamp-1 leading-snug">
                    {notif.message}
                  </p>

                  {/* Bottom: Portfolio Target & Read Status */}
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    {notif.portfolioTitle ? (
                      <span className="text-slate-700 font-medium truncate max-w-[210px] flex items-center gap-1">
                        <span className="text-slate-400">↳</span> {notif.portfolioTitle}
                      </span>
                    ) : (
                      <span className="text-slate-400">System Notification</span>
                    )}

                    {!notif.isRead && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 font-sans shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 live-beacon" />
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-beacon" />
            <span>Telemetry Active</span>
          </span>
          <span>
            {filteredNotifications.length > 5
              ? `5 of ${filteredNotifications.length} visible • scroll for more`
              : `${filteredNotifications.length} signal${filteredNotifications.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </motion.div>
    </>
  );
}
