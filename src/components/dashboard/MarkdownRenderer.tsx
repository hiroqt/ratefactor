"use client";

import React, { useState, useMemo } from "react";
import { marked } from "marked";
import { Code, Eye, Copy, Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content?: string;
  className?: string;
  showToolbar?: boolean;
}

// Configure marked with GFM support
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Sanitizes markdown/HTML string to strip malicious execution scripts
 * while preserving styling, alignments, badges, images, SVGs, tables, and links.
 */
function sanitizeHtmlOutput(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "")
    .replace(/<base\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*\/?>/gi, "")
    .replace(/<\/?form\b[^>]*>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "") // strip event handlers (onclick, onerror, onload, etc)
    .replace(/(?:href|src|action|xlink:href|formaction)\s*=\s*["']?\s*(?:javascript|vbscript):[^"'>]+/gi, 'href="#"');
}

export function MarkdownRenderer({
  content = "",
  className = "",
  showToolbar = true,
}: MarkdownRendererProps) {
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [copied, setCopied] = useState(false);

  const parsedHtml = useMemo(() => {
    if (!content || !content.trim()) return "";
    try {
      const rawHtml = marked.parse(content) as string;
      return sanitizeHtmlOutput(rawHtml);
    } catch {
      return sanitizeHtmlOutput(content);
    }
  }, [content]);

  const handleCopySource = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content || !content.trim()) {
    return (
      <p className="text-xs text-slate-400 italic py-2">
        No README content provided.
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {showToolbar && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                viewMode === "visual"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Eye className="w-3 h-3" />
              <span>Rendered Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("html")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                viewMode === "html"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Code className="w-3 h-3" />
              <span>HTML / Source Reader</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopySource}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Copy raw markdown / HTML"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Source</span>
              </>
            )}
          </button>
        </div>
      )}

      {viewMode === "visual" ? (
        <div
          className={cn(
            "github-readme-render text-xs sm:text-sm text-slate-800 leading-relaxed max-w-full overflow-hidden break-words",
            className
          )}
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />
      ) : (
        <div className="relative">
          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-[500px]">
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
