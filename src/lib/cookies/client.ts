import {
  COOKIE_UI_PREFS,
  COOKIE_GUEST_BOOKMARKS,
  COOKIE_CONSENT,
  UIPrefs,
  CookieConsent,
} from "./constants";

/**
 * Client-side cookie utilities for non-HttpOnly browser cookies.
 */

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number = 60 * 60 * 24 * 365,
  path: string = "/"
): void {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAgeSeconds}; Path=${path}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

export function getClientUIPrefs(): UIPrefs {
  const val = getCookie(COOKIE_UI_PREFS);
  if (val) {
    try {
      return JSON.parse(val);
    } catch {}
  }
  return { layout: "grid", density: "comfortable", sortBy: "latest" };
}

export function setClientUIPrefs(prefs: UIPrefs): void {
  setCookie(COOKIE_UI_PREFS, JSON.stringify(prefs), 60 * 60 * 24 * 365);
}

export function getClientGuestBookmarks(): string[] {
  const val = getCookie(COOKIE_GUEST_BOOKMARKS);
  if (val) {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

export function setClientGuestBookmarks(ids: string[]): void {
  const capped = ids.slice(0, 30);
  setCookie(COOKIE_GUEST_BOOKMARKS, JSON.stringify(capped), 60 * 60 * 24 * 90);
}

export function getClientCookieConsent(): CookieConsent | null {
  const val = getCookie(COOKIE_CONSENT);
  if (val) {
    try {
      return JSON.parse(val);
    } catch {}
  }
  return null;
}

export function setClientCookieConsent(consent: CookieConsent): void {
  setCookie(COOKIE_CONSENT, JSON.stringify(consent), 60 * 60 * 24 * 180);
}
