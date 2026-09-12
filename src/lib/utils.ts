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

export function timeAgo(timestamp: string | Date): string {
  const date = new Date(timestamp);
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
  if (!dateStr) return "Jan 01, 2026";
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


