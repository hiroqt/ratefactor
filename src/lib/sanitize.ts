/**
 * Input Sanitization Module
 * Zero-dependency sanitizer for comment content to prevent XSS, HTML injection,
 * SQL injection markers, and control character abuse.
 *
 * Applied server-side BEFORE Zod validation and guardrail checks,
 * and client-side as defense-in-depth.
 */

/** Hard cap: reject any input exceeding 6KB to prevent oversized payloads */
const MAX_INPUT_BYTES = 6 * 1024;

/**
 * Dangerous HTML tags that could execute scripts or embed external content.
 * Matches both opening and self-closing variants.
 */
const DANGEROUS_HTML_TAGS_REGEX =
  /<\s*\/?\s*(script|iframe|object|embed|form|input|button|link|meta|style|base|applet|svg|math|template|slot|dialog|details|marquee|bgsound|video|audio|source|picture)\b[^>]*\/?>/gi;

/**
 * Event handler attributes that can execute JavaScript.
 * Matches on* attributes like onerror, onclick, onload, etc.
 */
const EVENT_HANDLER_ATTR_REGEX =
  /\b(on\w+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * JavaScript protocol URIs: `javascript:`, `vbscript:`, `data:text/html`
 */
const DANGEROUS_URI_REGEX =
  /(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi;

/**
 * HTML entity sequences that could decode into dangerous characters.
 * Matches decimal (&#60;), hex (&#x3C;), and named (&lt;) entities.
 */
const HTML_ENTITY_REGEX = /&(?:#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi;

/**
 * Common SQL injection markers.
 * Not a full SQL firewall — just catches the most blatant payloads.
 */
const SQL_INJECTION_PATTERNS = [
  /'?\s*;\s*DROP\s+TABLE\s+\w*/gi,
  /'?\s*;\s*DELETE\s+FROM\s+\w*/gi,
  /'?\s*;\s*INSERT\s+INTO\s+\w*/gi,
  /'?\s*;\s*UPDATE\s+\w+\s+SET/gi,
  /UNION\s+(ALL\s+)?SELECT/gi,
  /'\s*OR\s+'?\d+'?\s*=\s*'?\d+'?/gi,
  /'\s*OR\s+''='/gi,
  /(?:;\s*)?--(?:\s+|$)/g,
  /\/\*[\s\S]*?\*\//g,
];

/**
 * Control characters and zero-width Unicode that can be used to hide content
 * or break rendering:
 * - U+0000–U+001F (C0 controls, except \n \r \t)
 * - U+007F (DEL)
 * - U+200B (zero-width space)
 * - U+200C–U+200F (zero-width joiners, directional marks)
 * - U+202A–U+202E (directional overrides — used to visually hide text)
 * - U+2060 (word joiner)
 * - U+FEFF (BOM / zero-width no-break space)
 * - U+FFF9–U+FFFB (interlinear annotation anchors)
 */
const CONTROL_CHARS_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200F\u202A-\u202E\u2060\uFEFF\uFFF9-\uFFFB]/g;

/**
 * Sanitises raw user input for safe storage and display.
 *
 * This is NOT an HTML renderer sanitiser (like DOMPurify). It is a
 * pre-storage cleaner that strips anything that has no business being
 * in a plain-text developer comment.
 *
 * Layers:
 * 1. Byte-length cap
 * 2. Control character removal
 * 3. HTML tag stripping
 * 4. Event handler attribute stripping
 * 5. Dangerous URI protocol neutralisation
 * 6. HTML entity decoding prevention
 * 7. SQL injection marker stripping
 * 8. Whitespace normalisation
 */
export function sanitizeCommentInput(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let text = raw;

  // 1. Byte-length hard cap — truncate oversized payloads
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length > MAX_INPUT_BYTES) {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    text = decoder.decode(bytes.slice(0, MAX_INPUT_BYTES));
  }

  // 2. Strip control characters (preserve newlines, carriage returns, tabs)
  text = text.replace(CONTROL_CHARS_REGEX, "");

  // 3. Strip dangerous HTML tags
  text = text.replace(DANGEROUS_HTML_TAGS_REGEX, "");

  // 4. Strip remaining HTML-like angle bracket tags as a catch-all
  // (but preserve mathematical < > in contexts like "x < 10")
  text = text.replace(/<\s*\/?\s*[a-z][a-z0-9]*\b[^>]*\/?>/gi, "");

  // 5. Strip event handler attributes (in case partial tags survive)
  text = text.replace(EVENT_HANDLER_ATTR_REGEX, "");

  // 6. Neutralise dangerous URI protocols
  text = text.replace(DANGEROUS_URI_REGEX, "[blocked]:");

  // 7. Decode and neutralise HTML entities that could reconstruct tags
  // Replace entity sequences with their literal text representation
  text = text.replace(HTML_ENTITY_REGEX, (match) => {
    // Keep harmless entities like &amp; &nbsp; but strip anything
    // that decodes to < > " ' which can reconstruct HTML
    const harmless = ["&amp;", "&nbsp;", "&quot;", "&apos;", "&copy;", "&reg;", "&trade;", "&mdash;", "&ndash;", "&hellip;"];
    if (harmless.includes(match.toLowerCase())) return match;
    return "";
  });

  // 8. Strip SQL injection markers
  for (const pattern of SQL_INJECTION_PATTERNS) {
    text = text.replace(pattern, "");
  }

  // 9. Whitespace normalisation
  // Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");
  // Collapse excessive spaces (5+) to single space
  text = text.replace(/ {5,}/g, " ");
  // Trim leading/trailing whitespace
  text = text.trim();

  return text;
}

/**
 * Validates raw request body size from Content-Length header.
 * Returns true if the payload is within acceptable limits.
 *
 * @param contentLength - The Content-Length header value
 * @param maxBytes - Maximum allowed bytes (default 10KB)
 */
export function isPayloadSizeAcceptable(
  contentLength: string | null,
  maxBytes: number = 10 * 1024
): boolean {
  if (!contentLength) return true; // Let downstream handle missing header
  const size = parseInt(contentLength, 10);
  if (isNaN(size)) return true;
  return size <= maxBytes;
}
