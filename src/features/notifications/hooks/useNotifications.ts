"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { NotificationItem } from "@/types/portfolio";

// Module-level shared cache and subscription set across components and pages
let globalNotifications: NotificationItem[] = [];
let globalUnreadCount = 0;
const subscribers = new Set<(notifs: NotificationItem[], unread: number) => void>();

function notifySubscribers() {
  subscribers.forEach((callback) => callback(globalNotifications, globalUnreadCount));
}

function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const savedUser = localStorage.getItem("ratefactor_auth_user");
    if (savedUser) return true;
    if (
      document.cookie.includes("ratefactor_session_token") ||
      document.cookie.includes("better-auth.session_token")
    ) {
      return true;
    }
  } catch {}
  return false;
}

export function useNotifications(initial?: NotificationItem[]) {
  const [notifications, setNotificationsState] = useState<NotificationItem[]>(() => {
    if (globalNotifications.length > 0) return globalNotifications;
    return initial || [];
  });
  const [unreadCount, setUnreadCountState] = useState<number>(() => {
    if (globalNotifications.length > 0) return globalUnreadCount;
    return initial ? initial.filter((n) => !n.isRead).length : 0;
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const isFetchingRef = useRef(false);

  // Subscribe to shared global state changes
  useEffect(() => {
    const subscriber = (notifs: NotificationItem[], unread: number) => {
      setNotificationsState(notifs);
      setUnreadCountState(unread);
    };
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  // Fetch notifications from server API only if user has active session
  const refreshNotifications = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (!hasActiveSession()) {
      if (globalNotifications.length > 0 || globalUnreadCount > 0) {
        globalNotifications = [];
        globalUnreadCount = 0;
        notifySubscribers();
      }
      return;
    }

    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        globalNotifications = data.notifications;
        globalUnreadCount =
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : data.notifications.filter((n: NotificationItem) => !n.isRead).length;
        notifySubscribers();
      }
    } catch {
      // Offline/unauthenticated fallback
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Active polling & event synchronization
  useEffect(() => {
    // Initial fetch on mount
    refreshNotifications();

    // Re-fetch on focus and network reconnection
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshNotifications();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ratefactor_notifs_sync" || e.key === "ratefactor_auth_user") {
        refreshNotifications();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("ratefactor:user-registered", handleFocus);
    window.addEventListener("ratefactor:user-changed", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 30-second heartbeat polling for active, visible tab
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshNotifications();
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ratefactor:user-registered", handleFocus);
      window.removeEventListener("ratefactor:user-changed", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      clearInterval(interval);
    };
  }, [refreshNotifications]);

  const setNotifications = useCallback((updater: React.SetStateAction<NotificationItem[]>) => {
    const next = typeof updater === "function" ? updater(globalNotifications) : updater;
    globalNotifications = next;
    globalUnreadCount = next.filter((n) => !n.isRead).length;
    notifySubscribers();
  }, []);

  const markAllAsRead = useCallback(() => {
    // Optimistic local update
    globalNotifications = globalNotifications.map((n) => ({ ...n, isRead: true }));
    globalUnreadCount = 0;
    notifySubscribers();

    // Broadcast across tabs
    try {
      localStorage.setItem("ratefactor_notifs_sync", Date.now().toString());
    } catch {}

    // Persist to server
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, []);

  const markAsRead = useCallback((id: string) => {
    // Optimistic local update
    globalNotifications = globalNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    globalUnreadCount = globalNotifications.filter((n) => !n.isRead).length;
    notifySubscribers();

    // Broadcast across tabs
    try {
      localStorage.setItem("ratefactor_notifs_sync", Date.now().toString());
    } catch {}

    // Persist to server
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const addNotification = useCallback((item: NotificationItem) => {
    globalNotifications = [item, ...globalNotifications.filter((n) => n.id !== item.id)];
    globalUnreadCount = globalNotifications.filter((n) => !n.isRead).length;
    notifySubscribers();

    try {
      localStorage.setItem("ratefactor_notifs_sync", Date.now().toString());
    } catch {}
  }, []);

  return {
    notifications,
    setNotifications,
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    markAllAsRead,
    markAsRead,
    addNotification,
    refreshNotifications,
  };
}
