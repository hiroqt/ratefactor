"use client";

import React, { useState } from "react";
import { 
  X, 
  Bell, 
  Flame, 
  Star, 
  Heart, 
  MessageSquare, 
  CheckCheck, 
  Zap, 
  ArrowRight,
  Filter
} from "lucide-react";
import { NotificationItem, Portfolio } from "@/types/portfolio";
import { cn, timeAgo } from "@/lib/utils";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onSimulateIncoming: () => void;
  onSelectPortfolioById: (id: string) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onSimulateIncoming,
  onSelectPortfolioById,
}: NotificationDrawerProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "showcase" | "engagement">("all");

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "showcase") return n.type === "showcase";
    if (filter === "engagement") return n.type === "like" || n.type === "rating" || n.type === "comment";
    return true;
  });

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "showcase":
        return <Flame className="w-4 h-4 text-brand-400" />;
      case "rating":
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case "like":
        return <Heart className="w-4 h-4 text-accent-rose fill-accent-rose" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      default:
        return <Bell className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-border/80 bg-surface-raised flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  Real-Time Notifications
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.2 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </h3>
                <span className="text-[10px] font-mono text-muted">
                  Supabase Realtime Feed Channel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Simulation Bar & Actions */}
          <div className="p-3 bg-surface-raised/50 border-b border-border/60 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSimulateIncoming}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-mono transition-colors"
              title="Simulates real-time event pushed from Supabase Realtime"
            >
              <Zap className="w-3 h-3 text-brand-400" />
              <span>Simulate Realtime Event</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors font-mono"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-border/40 flex items-center gap-1 text-xs font-mono overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "all" ? "bg-surface-raised text-foreground border border-border" : "text-muted"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "unread" ? "bg-surface-raised text-foreground border border-border" : "text-muted"
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("showcase")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "showcase" ? "bg-surface-raised text-foreground border border-border" : "text-muted"
              )}
            >
              Showcases
            </button>
            <button
              type="button"
              onClick={() => setFilter("engagement")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "engagement" ? "bg-surface-raised text-foreground border border-border" : "text-muted"
              )}
            >
              Engagement
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted text-xs font-mono">
                No notifications matching this filter.
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    onSelectPortfolioById(n.portfolioId);
                  }}
                  className={cn(
                    "group p-3 rounded-lg border transition-all cursor-pointer relative",
                    n.isRead
                      ? "bg-surface/50 border-border/60 hover:border-border"
                      : "bg-surface-raised border-border hover:border-brand-500/40 shadow-sm"
                  )}
                >
                  {!n.isRead && (
                    <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-400" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={n.actorAvatar}
                        alt={n.actorName}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-surface-raised border border-border">
                        {getNotificationIcon(n.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-xs">
                        <strong className="text-foreground font-semibold">
                          {n.actorName}
                        </strong>{" "}
                        <span className="text-muted">{n.message}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-muted-dark">
                        <span className="text-brand-400/80 truncate max-w-[180px]">
                          {n.portfolioTitle}
                        </span>
                        <span>{timeAgo(n.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/80 bg-surface-raised text-center text-[11px] font-mono text-muted">
            ⚡ Powered by Supabase Realtime WebSocket client
          </div>

        </div>
      </div>
    </div>
  );
}
