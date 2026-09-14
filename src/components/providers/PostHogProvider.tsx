"use client";

import React, { useEffect, useRef } from "react";
import { initPostHog } from "@/lib/posthog";
import { trackClientNetworkStatus } from "@/lib/uptime";
import { trackEvent } from "@/lib/analytics";
import { getClientCookieConsent } from "@/lib/cookies";

export interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const offlineStartRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Initialize PostHog client if consent is granted or not explicitly denied
    const consent = getClientCookieConsent();
    const isAnalyticsAllowed = consent ? consent.analytics : true; // Default permissive in dev/preview, restricted if explicitly essential_only

    if (isAnalyticsAllowed) {
      initPostHog();
    }

    const handleConsentUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ analytics: boolean }>;
      if (customEvent.detail?.analytics) {
        initPostHog();
      }
    };

    window.addEventListener("rf_cookie_consent_updated", handleConsentUpdate);

    // 2. Track initial page view if allowed
    if (isAnalyticsAllowed) {
      trackEvent("page_view", {
        path: window.location.pathname,
        search: window.location.search,
        referrer: document.referrer,
      });
    }

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
      window.removeEventListener("rf_cookie_consent_updated", handleConsentUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
