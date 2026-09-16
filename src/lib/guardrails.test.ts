import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCommentContent,
  normalizeLeetSpeak,
// @ts-expect-error Node built-in runner
} from "./guardrails.ts";
import {
  sanitizeCommentInput,
  isPayloadSizeAcceptable,
// @ts-expect-error Node built-in runner
} from "./sanitize.ts";
import {
  checkRateLimit,
  resetRateLimitStore,
  RATE_LIMIT_PRESETS,
// @ts-expect-error Node built-in runner
} from "./rate-limit.ts";

// ─────────────────────────────────────────────────────────────
// 1. Tagalog & English Profanity Guardrail Tests
// ─────────────────────────────────────────────────────────────

test("blocks exact profanity 'p0t4ng 1n4 m0' and leet variations", () => {
  const variations = [
    "p0t4ng 1n4 m0 ang pangit nito",
    "potang ina mo grabe",
    "putang ina mo ang pangit",
    "p.u.t.a.n.g.i.n.a mo",
    "t4ng1n4 mo naman dev",
    "tangina mo napakapangit",
    "p0tangina mo",
    "kingina mo bro",
    "k1ng1n4 m0",
  ];

  for (const text of variations) {
    const res = validateCommentContent(text);
    assert.equal(res.isValid, false, `Expected "${text}" to be blocked as profanity`);
  }
});

test("blocks insult words like gago, bobo, tanga, ulol with leet-speak", () => {
  const insults = [
    "g4g0 k4 ba naman eh",
    "b0b0 m0 naman mag code",
    "t4ng4 mo mag design",
    "ul0l ka napaka pangit",
    "inutil na developer ito",
    "leche ka ayusin mo to",
    "p@kyu ka developer",
    "pakyu developer scammer",
    "pakshet ang pangit nito",
    "tarantado kang developer",
  ];

  for (const text of insults) {
    const res = validateCommentContent(text);
    assert.equal(res.isValid, false, `Expected "${text}" to be blocked`);
  }
});

test("blocks violent / malicious threats", () => {
  const threats = [
    "papatayin kita pag nakita kita",
    "sasaksakin kita sa personal",
    "susunugin ko bahay mo",
  ];

  for (const text of threats) {
    const res = validateCommentContent(text);
    assert.equal(res.isValid, false, `Expected threat "${text}" to be blocked`);
  }
});

test("allows constructive Tagalog feedback without false positives", () => {
  const safeComments = [
    "Magandang gawa! Gusto ko ang design ng responsive layout mo.",
    "Paano mo ginawa yung animation sa hero section? Napakalinis.",
    "May napansin akong bug sa navbar kapag nag-scroll sa mobile view.",
    "Solid ang architecture, maganda ang pagkakahiwalay ng modules.",
    "Ganda ng typography at color scheme, bagay sa developer persona.",
    "Subukan mo magdagdag ng unit tests para sa utility functions mo.",
  ];

  for (const text of safeComments) {
    const res = validateCommentContent(text);
    assert.equal(res.isValid, true, `Expected "${text}" to be allowed, but got: ${res.error}`);
  }
});

test("blocks low-effort filler phrases in English and Tagalog", () => {
  assert.equal(validateCommentContent("nice").isValid, false);
  assert.equal(validateCommentContent("cool").isValid, false);
  assert.equal(validateCommentContent("lodi").isValid, false);
  assert.equal(validateCommentContent("ayos").isValid, false);
  assert.equal(validateCommentContent("first").isValid, false);
});

test("normalizeLeetSpeak correctly decodes common substitutions", () => {
  assert.equal(normalizeLeetSpeak("p0t4ng 1n4 m0"), "potang ina mo");
  assert.equal(normalizeLeetSpeak("g4g0"), "gago");
  assert.equal(normalizeLeetSpeak("b0b0"), "bobo");
  assert.equal(normalizeLeetSpeak("p.u.t.a"), "puta");
  assert.equal(normalizeLeetSpeak("t4ng1n4"), "tangina");
});

// ─────────────────────────────────────────────────────────────
// 2. Input Sanitization Tests
// ─────────────────────────────────────────────────────────────

test("sanitizes script tags and inline handlers", () => {
  const malicious = '<script>alert("xss")</script>This is a real comment about your code.';
  const sanitized = sanitizeCommentInput(malicious);
  assert.equal(sanitized.includes("<script>"), false);
  assert.equal(sanitized.includes("alert"), true); // Content stripped of tag
  assert.equal(sanitized.includes("This is a real comment"), true);
});

test("sanitizes img onerror and iframe injections", () => {
  const malicious = '<img src="x" onerror="stealCookies()">Great architecture on this project!';
  const sanitized = sanitizeCommentInput(malicious);
  assert.equal(sanitized.includes("onerror"), false);
  assert.equal(sanitized.includes("<img"), false);
  assert.equal(sanitized.includes("Great architecture"), true);
});

test("sanitizes SQL injection markers", () => {
  const sqlPayload = "'; DROP TABLE comments; -- Awesome work on the database schema!";
  const sanitized = sanitizeCommentInput(sqlPayload);
  assert.equal(sanitized.includes("DROP TABLE"), false);
  assert.equal(sanitized.includes("--"), false);
  assert.equal(sanitized.includes("Awesome work"), true);
});

test("strips control characters and zero-width spaces", () => {
  const hiddenText = "Normal\u200B\u200C\u200D\uFEFF text with zero-width characters";
  const sanitized = sanitizeCommentInput(hiddenText);
  assert.equal(sanitized, "Normal text with zero-width characters");
});

test("isPayloadSizeAcceptable validates content length headers", () => {
  assert.equal(isPayloadSizeAcceptable("500", 1024), true);
  assert.equal(isPayloadSizeAcceptable("2048", 1024), false);
  assert.equal(isPayloadSizeAcceptable(null, 1024), true);
});

// ─────────────────────────────────────────────────────────────
// 3. Rate Limiting Tests
// ─────────────────────────────────────────────────────────────

test("rate limit presets contain COMMENT_BURST and COMMENT_FLAGGED", () => {
  assert.ok(RATE_LIMIT_PRESETS.COMMENT_BURST);
  assert.equal(RATE_LIMIT_PRESETS.COMMENT_BURST.limit, 10);
  assert.ok(RATE_LIMIT_PRESETS.COMMENT_FLAGGED);
  assert.equal(RATE_LIMIT_PRESETS.COMMENT_FLAGGED.limit, 1);
});

test("rate limiter enforces comment limits and debounce", () => {
  resetRateLimitStore();
  const id = "test-user-rate-limit";

  const first = checkRateLimit(id, "COMMENT");
  assert.equal(first.allowed, true);

  // Immediate second attempt should trigger debounce cooldown
  const second = checkRateLimit(id, "COMMENT");
  assert.equal(second.allowed, false);
  assert.ok(second.reason?.includes("cooldown"));
});
