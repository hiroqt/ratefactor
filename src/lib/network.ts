/**
 * Network Resilience & Offline Detection Engine
 * 
 * Provides:
 * - fetchWithTimeout: AbortController-wrapped fetch with guaranteed deadline
 * - isSlowNetwork: Effective connection type detection ('slow-2g', '2g', '3g')
 * - Network status listeners with automatic reconnect announcements
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface NetworkStatus {
  online: boolean;
  isSlow: boolean;
  effectiveType: string;
  saveData: boolean;
}

/**
 * Executes a network fetch with guaranteed timeout and optional retry backoff.
 * Prevents hanging UI spinners and stuck promises during flaky/slow connections.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutOptions
): Promise<Response> {
  const {
    timeoutMs = 8000,
    retries = 0,
    retryDelayMs = 1000,
    signal: userSignal,
    ...restInit
  } = init || {};

  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    // Forward user signal if passed
    if (userSignal) {
      userSignal.addEventListener("abort", () => controller.abort(userSignal.reason), {
        once: true,
      });
    }

    try {
      const response = await fetch(input, {
        ...restInit,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = controller.signal.aborted || error?.name === "AbortError";
      const isRetryable =
        attempt < retries &&
        (isTimeout || error?.name === "TypeError" || error?.message?.includes("fetch"));

      if (isRetryable) {
        attempt++;
        await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
        continue;
      }

      throw error;
    }
  }
}

/**
 * Returns current network performance and connectivity status
 */
export function getNetworkStatus(): NetworkStatus {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      online: true,
      isSlow: false,
      effectiveType: "4g",
      saveData: false,
    };
  }

  const online = navigator.onLine !== false;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const effectiveType = conn?.effectiveType || "4g";
  const saveData = conn?.saveData === true;
  const isSlow =
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    (conn?.rtt !== undefined && conn.rtt > 1200);

  return {
    online,
    isSlow,
    effectiveType,
    saveData,
  };
}

type NetworkListener = (status: NetworkStatus) => void;
const listeners = new Set<NetworkListener>();

if (typeof window !== "undefined") {
  const notifyListeners = () => {
    const current = getNetworkStatus();
    listeners.forEach((fn) => {
      try {
        fn(current);
      } catch {}
    });
  };

  window.addEventListener("online", notifyListeners);
  window.addEventListener("offline", notifyListeners);

  const conn = (navigator as any).connection;
  if (conn?.addEventListener) {
    conn.addEventListener("change", notifyListeners);
  }
}

/**
 * Subscribes to network connectivity and bandwidth quality updates
 */
export function onNetworkStatusChange(listener: NetworkListener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    listener(getNetworkStatus());
  }
  return () => {
    listeners.delete(listener);
  };
}
