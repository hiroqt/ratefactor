/**
 * Telemetry and Analytics module conforming to ARD_PRD_Ratefactor.md Section 8.
 * Integrates PostHog and Sentry telemetry without blocking UI or throwing errors.
 */

import { captureClientEvent } from "./posthog";

type EventName =
  | "page_view"
  | "portfolio_view"
  | "portfolio_like"
  | "portfolio_rate"
  | "portfolio_comment"
  | "portfolio_delete"
  | "portfolio_submit"
  | "showcase_impression"
  | "showcase_click"
  | "showcase_cron_triggered"
  | "filter_applied"
  | "uptime_heartbeat"
  | "downtime_incident"
  | "uptime_client_online"
  | "downtime_client_offline"
  | "sentry_test_error_triggered";

interface EventPayload {
  [key: string]: string | number | boolean | null | undefined | Record<string, any>;
}

export function trackEvent(event: EventName | string, properties?: EventPayload): void {
  try {
    captureClientEvent(event, properties);

    // Non-obtrusive development logging
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Analytics] ${event}`, properties);
    }
  } catch (err) {
    // Analytics failure must NEVER block or break user actions
    console.warn(`[Analytics] Failed to track ${event}:`, err);
  }
}
