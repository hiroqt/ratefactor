import { cookies } from "next/headers";
import {
  COOKIE_SESSION_TOKEN,
  COOKIE_SESSION_TOKEN_FALLBACK,
  COOKIE_UI_PREFS,
  COOKIE_GUEST_BOOKMARKS,
  COOKIE_CONSENT,
  UIPrefs,
  CookieConsent,
  SECURE_COOKIE_OPTIONS,
  PUBLIC_COOKIE_OPTIONS,
} from "./constants";

/**
 * Server-side cookie helpers for Next.js 15 App Router.
 * Uses async `await cookies()` compliant with Next.js 15+ specifications.
 */

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return (
    cookieStore.get(COOKIE_SESSION_TOKEN)?.value ||
    cookieStore.get(COOKIE_SESSION_TOKEN_FALLBACK)?.value
  );
}

export async function getUIPrefs(): Promise<UIPrefs> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_UI_PREFS)?.value;
    if (raw) {
      return JSON.parse(decodeURIComponent(raw));
    }
  } catch {}
  return { layout: "grid", density: "comfortable", sortBy: "latest" };
}

export async function setUIPrefs(prefs: UIPrefs): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_UI_PREFS, encodeURIComponent(JSON.stringify(prefs)), {
      ...PUBLIC_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } catch (e) {
    // In Server Components, cookies cannot be mutated; only in Route Handlers & Server Actions
  }
}

export async function getGuestBookmarks(): Promise<string[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_GUEST_BOOKMARKS)?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

export async function setGuestBookmarks(ids: string[]): Promise<void> {
  try {
    const cookieStore = await cookies();
    // Cap at 30 items to prevent cookie header bloat
    const capped = ids.slice(0, 30);
    cookieStore.set(COOKIE_GUEST_BOOKMARKS, encodeURIComponent(JSON.stringify(capped)), {
      ...PUBLIC_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });
  } catch (e) {
    // Read-only context guard
  }
}

export async function getCookieConsent(): Promise<CookieConsent | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_CONSENT)?.value;
    if (raw) {
      return JSON.parse(decodeURIComponent(raw));
    }
  } catch {}
  return null;
}

export async function setCookieConsent(consent: CookieConsent): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_CONSENT, encodeURIComponent(JSON.stringify(consent)), {
      ...PUBLIC_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 180, // 180 days
    });
  } catch (e) {}
}

export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_SESSION_TOKEN);
    cookieStore.delete(COOKIE_SESSION_TOKEN_FALLBACK);
  } catch (e) {}
}
