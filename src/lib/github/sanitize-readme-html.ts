import sanitizeHtml from "sanitize-html";

/**
 * The single allowlist-based sanitizer for README-derived HTML.
 *
 * This must run on the HTML produced by `marked.parse(...)`, not on the raw
 * Markdown source: a Markdown file can embed raw HTML (marked passes it
 * through untouched) or encoded URIs that only become dangerous once parsed.
 * Sanitizing pre-parse can't see either case. `sanitize-html` parses the
 * markup with a real HTML parser (not regex), so it decodes entities before
 * checking attribute values and URI schemes — that's what catches things
 * like an HTML-entity-encoded `javascript:` href.
 */
export function sanitizeReadmeHtml(untrustedHtml: string): string {
  return sanitizeHtml(untrustedHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "b", "em", "i", "u", "s", "del", "ins", "sub", "sup",
      "a", "img",
      "ul", "ol", "li",
      "blockquote",
      "code", "pre",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "details", "summary",
      "div", "span",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "name", "id"],
      img: ["src", "alt", "title", "width", "height"],
      th: ["align", "colspan", "rowspan"],
      td: ["align", "colspan", "rowspan"],
      "*": ["id"],
    },
    // No inline SVG: README badges/images are always remote <img src="...">,
    // never inline <svg> markup — allowing that tag would open up an
    // XSS-capable surface (SVG can carry <script>/event handlers) for no
    // real README use case.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
}
