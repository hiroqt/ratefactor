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

  const simulateIncoming = useCallback(() => {
    const mockActors = [
      { name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
      { name: "Marcus Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
      { name: "Devon Vance", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" },
    ];
    const randomActor = mockActors[Math.floor(Math.random() * mockActors.length)];
    const types: NotificationItem["type"][] = ["like", "rating", "comment"];
    const pickedType = types[Math.floor(Math.random() * types.length)];

    let msg = "interacted with your portfolio.";
    let ratingScore: number | undefined;

    if (pickedType === "like") {
      msg = "liked your portfolio.";
    } else if (pickedType === "rating") {
      ratingScore = Number((4.0 + Math.random() * 1.0).toFixed(1));
      msg = `rated your portfolio ${ratingScore}/5.0.`;
    } else {
      msg = "commented: \"Super clean architecture and awesome performance!\"";
    }

    const newNotif: NotificationItem = {
      id: "sim-" + Date.now(),
      type: pickedType,
      actorName: randomActor.name,
      actorAvatar: randomActor.avatar,
      portfolioId: "portfolio-architecture",
      portfolioTitle: "Your Architecture",
      message: msg,
      ratingScore,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
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
    simulateIncoming,
  };
}
