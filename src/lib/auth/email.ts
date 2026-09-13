import crypto from "crypto";

/**
 * Domain sets for canonical email normalization
 */
const GOOGLE_DOMAINS = new Set(["gmail.com", "googlemail.com", "google.com"]);

const PLUS_ADDRESSING_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "google.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "fastmail.com",
  "yahoo.com",
]);

/**
 * Canonicalizes an email address to its primary mailbox destination.
 * 
 * Prevents multi-accounting abuse where attackers exploit:
 * 1. Gmail Dot Trick: "john.doe@gmail.com" === "johndoe@gmail.com" === "j.o.h.n.d.o.e@gmail.com"
 * 2. Gmail Plus Trick: "johndoe+bot1@gmail.com" === "johndoe+bot2@gmail.com" === "johndoe@gmail.com"
 * 3. Googlemail Domain Alias: "johndoe@googlemail.com" === "johndoe@gmail.com"
 * 4. Plus addressing on Outlook, iCloud, Proton, etc.
 */
export function canonicalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== "string") {
    return "";
  }

  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) {
    return trimmed;
  }

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  // Normalize googlemail.com to gmail.com
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  // Handle Google email addresses
  if (GOOGLE_DOMAINS.has(domain)) {
    // Strip all periods from the local-part
    local = local.replace(/\./g, "");
    // Strip plus sub-addressing (everything from '+' to end of local part)
    const plusIndex = local.indexOf("+");
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
  } else if (PLUS_ADDRESSING_DOMAINS.has(domain)) {
    // Strip plus sub-addressing for known providers
    const plusIndex = local.indexOf("+");
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
  }

  return `${local}@${domain}`;
}

/**
 * Computes a deterministic SHA-256 hash of the canonical email.
 * Ideal for indexing, rate-limiting, and Sybil-resistant voting/rating deduplication.
 */
export function getCanonicalEmailHash(rawEmail: string): string {
  const canonical = canonicalizeEmail(rawEmail);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Checks whether two email addresses resolve to the exact same mailbox.
 */
export function isSameCanonicalMailbox(emailA: string, emailB: string): boolean {
  return canonicalizeEmail(emailA) === canonicalizeEmail(emailB);
}

// In-memory registry of registered canonical email hashes to prevent alias multi-accounting
const registeredCanonicalHashes = new Set<string>();

/**
 * Registers a canonical email into the active registry.
 */
export function registerCanonicalEmail(email: string): void {
  const hash = getCanonicalEmailHash(email);
  registeredCanonicalHashes.add(hash);
}

/**
 * Checks if a canonical email or any of its aliases is already registered.
 */
export function isCanonicalEmailRegistered(email: string): boolean {
  const hash = getCanonicalEmailHash(email);
  return registeredCanonicalHashes.has(hash);
}
