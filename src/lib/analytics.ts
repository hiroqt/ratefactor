/**
 * Telemetry and Analytics module conforming to ARD_PRD_Ratefactor.md Section 8.
 * Supports PostHog and custom event sinks without blocking UI or throwing errors.
 */

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
  | "filter_applied";

interface EventPayload {
  [key: string]: string | number | boolean | null | undefined;
}

export function trackEvent(event: EventName, properties?: EventPayload): void {
  try {
    // If running in browser and PostHog is loaded
    if (typeof window !== "undefined") {
      const w = window as unknown as { posthog?: { capture: (e: string, p?: EventPayload) => void } };
      if (w.posthog && typeof w.posthog.capture === "function") {
        w.posthog.capture(event, properties);
      }
    }

    // Non-obtrusive development logging
    if (process.env.NODE_ENV === "development") {
      console.debug(`[Analytics] ${event}`, properties);
    }
  } catch (err) {
    // Analytics failure must NEVER block or break user actions
    console.warn(`[Analytics] Failed to track ${event}:`, err);
  }
}
