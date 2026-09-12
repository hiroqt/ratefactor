"use client";

import React, { useEffect, useRef } from "react";
import { initPostHog } from "@/lib/posthog";
import { trackClientNetworkStatus } from "@/lib/uptime";
import { trackEvent } from "@/lib/analytics";

export interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const offlineStartRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Initialize PostHog client
    initPostHog();

    // 2. Track initial page view
    trackEvent("page_view", {
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer,
    });

    // 3. Setup client uptime & network status listeners
    const handleOnline = () => {
      const durationOffline = offlineStartRef.current
        ? Date.now() - offlineStartRef.current
        : undefined;
      offlineStartRef.current = null;
      trackClientNetworkStatus(true, durationOffline);
    };

    const handleOffline = () => {
      offlineStartRef.current = Date.now();
      trackClientNetworkStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 4. Periodic client heartbeat (every 60 seconds)
    const interval = setInterval(() => {
      trackEvent("uptime_heartbeat", {
        clientUptimeSeconds: Math.floor(performance.now() / 1000),
        status: navigator.onLine ? "online" : "offline",
        timestamp: new Date().toISOString(),
      });
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
