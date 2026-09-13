"use client";

import { useState, useMemo, useCallback } from "react";
import { NotificationItem } from "@/types/portfolio";
import { INITIAL_NOTIFICATIONS } from "@/data/mockNotifications";

export function useNotifications(initial: NotificationItem[] = INITIAL_NOTIFICATIONS) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initial);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const addNotification = useCallback((item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev]);
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
  };
}
