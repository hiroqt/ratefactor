import { z } from "zod";

/**
 * Portfolio Domains — controlled allowlist describing the actual visual /
 * interaction / technical experience of a portfolio (e.g. "Three.js",
 * "GSAP"). Deliberately separate from `category` (the high-level
 * developer/portfolio classification) and `techStack` (free-form tech
 * tags). A portfolio can have multiple domains at once.
 *
 * This module is the single source of truth for the taxonomy — client
 * components, Zod validation, and the API all import from here so the list
 * never drifts. No Node-only imports: safe to use in both client and
 * server bundles.
 */
export const PORTFOLIO_DOMAINS = [
  "Three.js",
  "GSAP",
  "Framer Motion",
  "Parallax",
  "Scroll-heavy",
  "WebGL",
  "3D / Immersive",
  "Animation-heavy",
  "Interactive",
  "Experimental",
] as const;

export type PortfolioDomain = (typeof PORTFOLIO_DOMAINS)[number];

export const MIN_PORTFOLIO_DOMAINS = 1;
export const MAX_PORTFOLIO_DOMAINS = 5;

export function isPortfolioDomain(value: unknown): value is PortfolioDomain {
  return typeof value === "string" && (PORTFOLIO_DOMAINS as readonly string[]).includes(value);
}

// Normalizes a raw `domains` column value from a database row (or any other
// untrusted source) into a clean PortfolioDomain[]. Missing/non-array/old-
// shape values (rows created before this column existed) become `[]` rather
// than throwing — existing portfolios must keep rendering safely. Any stray
// value outside the allowlist is dropped rather than surfaced.
export function mapDomainsColumn(rawDomains: unknown): PortfolioDomain[] {
  if (!Array.isArray(rawDomains)) return [];
  return rawDomains.filter(isPortfolioDomain);
}

// Shared Zod fragment for the `domains` field on portfolio submissions —
// the single validation rule set (allowlist membership, 1-5 count, no
// duplicates) referenced by the submission schema, so tests exercise the
// exact schema production code uses instead of a re-implementation.
export const portfolioDomainsFieldSchema = z
  .array(z.enum(PORTFOLIO_DOMAINS))
  .min(MIN_PORTFOLIO_DOMAINS, `Select at least ${MIN_PORTFOLIO_DOMAINS} portfolio domain`)
  .max(MAX_PORTFOLIO_DOMAINS, `Cannot specify more than ${MAX_PORTFOLIO_DOMAINS} portfolio domains`)
  .refine((values) => new Set(values).size === values.length, {
    message: "Duplicate portfolio domains are not allowed",
  });
