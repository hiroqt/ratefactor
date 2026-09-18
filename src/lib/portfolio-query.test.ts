import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPortfolioWhereClause,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./portfolio-query.ts";

test("no filters yields only the published-status clause", () => {
  const { whereClause, filterValues } = buildPortfolioWhereClause({});
  assert.equal(whereClause, "p.status = 'published'");
  assert.deepEqual(filterValues, []);
});

test("category filter is parameterized, not inlined", () => {
  const { whereClause, filterValues } = buildPortfolioWhereClause({ category: "Fullstack" });
  assert.match(whereClause, /p\.category::text = \$1/);
  assert.deepEqual(filterValues, ["Fullstack"]);
});

test("domain filter uses array-containment on the domains column, parameterized", () => {
  const { whereClause, filterValues } = buildPortfolioWhereClause({ domain: "GSAP" });
  assert.match(whereClause, /p\.domains @> ARRAY\[\$1\]::text\[\]/);
  assert.deepEqual(filterValues, ["GSAP"]);
});

test("category and domain compose with independent parameter placeholders", () => {
  const { whereClause, filterValues } = buildPortfolioWhereClause({ category: "Fullstack", domain: "GSAP" });
  assert.match(whereClause, /p\.category::text = \$1/);
  assert.match(whereClause, /p\.domains @> ARRAY\[\$2\]::text\[\]/);
  assert.deepEqual(filterValues, ["Fullstack", "GSAP"]);
});

test("'All' category is treated as no filter", () => {
  const { whereClause, filterValues } = buildPortfolioWhereClause({ category: "All", domain: "GSAP" });
  assert.doesNotMatch(whereClause, /category/);
  assert.deepEqual(filterValues, ["GSAP"]);
});

test("no SQL injection: values always flow through parameter placeholders, never inlined", () => {
  const { whereClause } = buildPortfolioWhereClause({ domain: "'; DROP TABLE portfolios; --" });
  assert.doesNotMatch(whereClause, /DROP TABLE/);
});
