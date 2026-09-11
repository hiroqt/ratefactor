"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface MarkdownRendererProps {
  content?: string;
  className?: string;
}

// Helper to parse inline markdown: **bold**, `code`, [link](url), *italic*
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match links, code, bold, italic
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  parts.forEach((part, index) => {
    if (!part) return;

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      nodes.push(
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:text-sky-700 hover:underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{label}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </a>
      );
      return;
    }

    // Inline code: `code`
    const codeMatch = part.match(/^`([^`]+)`$/);
    if (codeMatch) {
      nodes.push(
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px]"
        >
          {codeMatch[1]}
        </code>
      );
      return;
    }

    // Bold: **text**
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      nodes.push(
        <strong key={index} className="font-bold text-slate-900">
          {boldMatch[1]}
        </strong>
      );
      return;
    }

    // Italic: *text*
    const italicMatch = part.match(/^\*([^*]+)\*$/);
    if (italicMatch) {
      nodes.push(
        <em key={index} className="italic text-slate-700">
          {italicMatch[1]}
        </em>
      );
      return;
    }

    // Plain text
    nodes.push(<span key={index}>{part}</span>);
  });

  return nodes;
}

export function MarkdownRenderer({ content = "", className = "" }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="text-xs text-slate-400 italic">No README.md content provided.</p>;
  }

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`list-${key}`} className="space-y-1.5 my-2.5 list-none pl-1">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
              <span className="text-slate-400 select-none mt-0.5">•</span>
              <div className="flex-1 leading-relaxed">{parseInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const flushCodeBlock = (key: number) => {
    if (codeBlockContent.length > 0) {
      blocks.push(
        <pre
          key={`code-${key}`}
          className="my-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto border border-slate-800"
        >
          <code>{codeBlockContent.join("\n")}</code>
        </pre>
      );
      codeBlockContent = [];
    }
  };

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock(index);
      } else {
        flushList(index);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList(index);
      return;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList(index);
      blocks.push(<hr key={`hr-${index}`} className="my-4 border-slate-200" />);
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList(index);
      blocks.push(
        <h3 key={`h3-${index}`} className="text-sm sm:text-base font-bold text-slate-900 mt-4 mb-2 flex items-center gap-1.5">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList(index);
      blocks.push(
        <h2 key={`h2-${index}`} className="text-base sm:text-lg font-bold text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-100">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList(index);
      blocks.push(
        <h1 key={`h1-${index}`} className="text-lg sm:text-xl font-extrabold text-slate-900 mt-6 mb-2 pb-1.5 border-b border-slate-200">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // List item
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentList.push(trimmed.slice(2));
      return;
    }

    // Regular paragraph
    flushList(index);
    blocks.push(
      <p key={`p-${index}`} className="text-xs text-slate-700 leading-relaxed my-1.5">
        {parseInline(line)}
      </p>
    );
  });

  flushList(lines.length);
  flushCodeBlock(lines.length);

  return <div className={`prose-sm max-w-none ${className}`}>{blocks}</div>;
}
