/**
 * PostHog Analytics and Monitoring Module
 * Fully isomorphic & Next.js App Router / Client / Edge compatible.
 */

const RAW_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_API_KEY || "";
// A valid PostHog client Project API key starts with "phc_"
const POSTHOG_KEY = RAW_KEY.startsWith("phc_") ? RAW_KEY : "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let posthogInstance: any = null;

/**
 * Initializes PostHog in the browser.
 */
export async function initPostHog(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.info("[PostHog] Initialized in mock/dev mode (no valid NEXT_PUBLIC_POSTHOG_KEY starting with 'phc_' set).");
    }
    return;
  }

  try {
    const { default: posthog } = await import("posthog-js");
    posthogInstance = posthog;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      advanced_disable_decide: false,
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.debug();
        }
      },
    });
  } catch (err) {
    console.warn("[PostHog] Failed to dynamically load posthog-js:", err);
  }
}

/**
 * Captures an event on the client side using posthog-js.
 */
export function captureClientEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  try {
    if (typeof window !== "undefined") {
      if (posthogInstance && typeof posthogInstance.capture === "function" && POSTHOG_KEY) {
        posthogInstance.capture(eventName, properties);
      }
      if (process.env.NODE_ENV === "development") {
        console.debug(`[PostHog Client] ${eventName}:`, properties);
      }
    }
  } catch (err) {
    console.warn(`[PostHog] Failed to capture client event ${eventName}:`, err);
  }
}

/**
 * Captures an event on the server side using the lightweight HTTP /capture/ API.
 * Works seamlessly across Node.js, Next.js Server Actions, and Edge runtimes.
 */
export async function captureServerEvent(
  eventName: string,
  distinctId: string = "system_health_monitor",
  properties?: Record<string, any>
): Promise<void> {
  try {
    if (!POSTHOG_KEY) {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[PostHog Server (Dev Mock)] ${eventName} (${distinctId}):`, properties);
      }
      return;
    }

    const payload = {
      api_key: POSTHOG_KEY,
      event: eventName,
      distinct_id: distinctId,
      properties: {
        ...properties,
        $timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        service: "ratefactor-server",
      },
    };

    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (process.env.NODE_ENV === "development") {
      console.debug(`[PostHog Server] ${eventName} (${distinctId}) dispatched to ${POSTHOG_HOST}`);
    }
  } catch (err) {
    console.warn(`[PostHog] Failed to capture server event ${eventName}:`, err);
  }
}

export { posthogInstance as posthog };
