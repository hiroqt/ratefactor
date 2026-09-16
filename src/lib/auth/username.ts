/**
 * Normalizes email or name into a clean username matching the PostgreSQL sync trigger:
 * LOWER(REGEXP_REPLACE(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
 * Enforces RateFactor database constraints: 3 <= char_length <= 30
 */
export function normalizeUsername(emailOrName?: string | null): string {
  if (!emailOrName) return "developer";
  const base = emailOrName.includes("@")
    ? emailOrName.split("@")[0]
    : emailOrName;
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const truncated = cleaned.slice(0, 30);
  if (truncated.length >= 3) return truncated;
  if (truncated.length > 0) {
    const padded = (truncated + "dev").slice(0, 30);
    return padded.length >= 3 ? padded : "developer";
  }
  return "developer";
}
