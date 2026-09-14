import crypto from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors the deterministic Better Auth -> profile id mapping applied by the
// handle_better_auth_user_sync() trigger in
// supabase/migrations/20260912000000_better_auth.sql: a UUID Better Auth id
// passes through unchanged; any other id maps to md5('ratefactor:' || id)::uuid.
// This lets ownership be resolved by direct id comparison instead of an
// unsafe OR-username lookup (usernames can be collision-adjusted). Shared by
// every route that needs to resolve the authenticated actor's own profile id
// for a server-side ownership check (e.g. self-rating and self-like prevention).
export function resolveCanonicalProfileId(betterAuthUserId: string): string {
  if (UUID_RE.test(betterAuthUserId)) return betterAuthUserId.toLowerCase();
  const hex = crypto.createHash("md5").update(`ratefactor:${betterAuthUserId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
