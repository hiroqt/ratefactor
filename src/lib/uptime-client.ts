/**
 * Client-side network uptime tracking, split out from ./uptime so that
 * client components never pull in that module's server-only pg Pool
 * dependency (used for the real database health check).
 */
import { captureClientEvent } from "./posthog";

export function trackClientNetworkStatus(online: boolean, durationOfflineMs?: number): void {
  if (online) {
    captureClientEvent("uptime_client_online", {
      status: "online",
      downtimeDurationMs: durationOfflineMs,
      timestamp: new Date().toISOString(),
    });
  } else {
    captureClientEvent("downtime_client_offline", {
      status: "offline",
      timestamp: new Date().toISOString(),
    });
  }
}
