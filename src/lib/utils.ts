import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

export function timeAgo(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "just now";
  // Safari / WebKit compatibility: convert SQL timestamp space separator to 'T'
  const normalizedStr = typeof timestamp === "string" ? timestamp.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, "$1T$2") : timestamp;
  const date = new Date(normalizedStr);
  if (isNaN(date.getTime())) return "just now";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Validates that a string is a well-formed HTTP/HTTPS URL with a valid host,
 * preventing javascript:, file:, data:, and malformed hosts.
 */
export function isValidHttpUrl(urlString: string): boolean {
  try {
    const trimmed = urlString.trim();
    if (!trimmed) return false;
    const url = new URL(trimmed);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const hasHost = Boolean(url.hostname) && (url.hostname === "localhost" || (url.hostname.includes(".") && !url.hostname.endsWith(".")));
    return isHttp && hasHost;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL for duplicate detection (lowercases hostname, trims trailing slash).
 */
export function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString.trim());
    return (url.origin + url.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return urlString.trim().toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Safely formats a rating number to 2 decimal places with null/NaN protection.
 */
export function formatRating(val?: number | null, fallback = 5.0): string {
  if (typeof val !== "number" || !Number.isFinite(val)) {
    return fallback.toFixed(2);
  }
  return val.toFixed(2);
}

/**
 * Formats a joined date into 'MMM DD, YYYY' format (e.g. 'Sep 12, 2026', 'Jan 01, 2026').
 */
export function formatJoinedDate(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === "2026") {
    // If not set, default to recent join date
    return "Sep 13, 2026";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return String(dateStr);
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";

/**
 * Normalizes avatar strings ensuring valid URLs or standard fallback instead of 404ing locally.
 */
export function normalizeAvatarUrl(url?: string | null, fallbackUsername?: string): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return DEFAULT_AVATAR;
  }

  const trimmed = url.trim();

  // Full URL, data URL, blob URL, or explicit static asset
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/placeholder") ||
    trimmed.startsWith("/icons/") ||
    trimmed.startsWith("/images/")
  ) {
    return trimmed;
  }

  // Handle explicit png asset or path
  const clean = trimmed.replace(/^\/+/, "").replace(/^@/, "");
  if (clean && !clean.includes("/")) {
    return DEFAULT_AVATAR;
  }

  return DEFAULT_AVATAR;
}

/**
 * Optimizes remote images (such as Unsplash) by adjusting width, quality, and format query params.
 */
export function getOptimizedImageUrl(url: string, width = 600, quality = 75): string {
  if (!url || typeof url !== "string") return DEFAULT_AVATAR;
  const normalized = normalizeAvatarUrl(url);
  if (normalized.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(normalized);
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format,compress");
      parsed.searchParams.set("fm", "webp");
      return parsed.toString();
    } catch {
      return normalized;
    }
  }
  return normalized;
}



