import assert from "node:assert/strict";
import test from "node:test";
import {
  PORTFOLIO_DOMAINS,
  isPortfolioDomain,
  portfolioDomainsFieldSchema,
  mapDomainsColumn,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./portfolio-domains.ts";

test("accepts multiple allowed domains", () => {
  const result = portfolioDomainsFieldSchema.safeParse(["GSAP", "Three.js", "Parallax"]);
  assert.equal(result.success, true);
});

test("rejects unknown domain values", () => {
  const result = portfolioDomainsFieldSchema.safeParse(["Not A Real Domain"]);
  assert.equal(result.success, false);
});

test("rejects duplicate domains", () => {
  const result = portfolioDomainsFieldSchema.safeParse(["GSAP", "GSAP"]);
  assert.equal(result.success, false);
});

test("rejects more than 5 domains", () => {
  const result = portfolioDomainsFieldSchema.safeParse([
    "Three.js", "GSAP", "Framer Motion", "Parallax", "Scroll-heavy", "WebGL",
  ]);
  assert.equal(result.success, false);
});

test("rejects an empty domains array", () => {
  const result = portfolioDomainsFieldSchema.safeParse([]);
  assert.equal(result.success, false);
});

test("accepts exactly 5 domains (the max)", () => {
  const result = portfolioDomainsFieldSchema.safeParse([
    "Three.js", "GSAP", "Framer Motion", "Parallax", "Scroll-heavy",
  ]);
  assert.equal(result.success, true);
});

test("isPortfolioDomain narrows to the allowlist only", () => {
  assert.equal(isPortfolioDomain("GSAP"), true);
  assert.equal(isPortfolioDomain("Not Real"), false);
  assert.equal(isPortfolioDomain(123), false);
});

test("mapDomainsColumn defaults a missing/undefined column to []", () => {
  assert.deepEqual(mapDomainsColumn(undefined), []);
  assert.deepEqual(mapDomainsColumn(null), []);
});

test("mapDomainsColumn passes through a valid domains array untouched", () => {
  assert.deepEqual(mapDomainsColumn(["GSAP", "Three.js"]), ["GSAP", "Three.js"]);
});

test("mapDomainsColumn drops any stray value outside the allowlist", () => {
  assert.deepEqual(mapDomainsColumn(["GSAP", "Not Real", 42]), ["GSAP"]);
});

test("PORTFOLIO_DOMAINS taxonomy contains the approved starting set", () => {
  const expected = [
    "Three.js", "GSAP", "Framer Motion", "Parallax", "Scroll-heavy",
    "WebGL", "3D / Immersive", "Animation-heavy", "Interactive", "Experimental",
  ];
  assert.deepEqual([...PORTFOLIO_DOMAINS], expected);
});
