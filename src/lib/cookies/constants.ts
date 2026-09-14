/**
 * RateFactor Cookie Constants and Configuration
 * Enforces secure defaults across Server and Client contexts.
 */

export const COOKIE_SESSION_TOKEN = "better-auth.session_token";
export const COOKIE_SESSION_TOKEN_FALLBACK = "session_token";
export const COOKIE_UI_PREFS = "rf_ui_prefs";
export const COOKIE_GUEST_BOOKMARKS = "rf_guest_bookmarks";
export const COOKIE_CONSENT = "rf_consent";
export const COOKIE_CSRF_TOKEN = "rf_csrf_token";

export interface UIPrefs {
  layout?: "grid" | "list";
  density?: "comfortable" | "compact";
  sortBy?: "latest" | "highest_rated" | "most_liked" | "trending";
}

export type ConsentStatus = "accepted" | "declined" | "essential_only";

export interface CookieConsent {
  status: ConsentStatus;
  analytics: boolean;
  timestamp: string;
}

export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const PUBLIC_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
