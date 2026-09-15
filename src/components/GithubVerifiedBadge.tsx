"use client";

import { Github, CheckBadge, CheckCircle2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Portfolio } from "@/types/portfolio";

/**
 * PROJECT-level GitHub verification badges. Deliberately visually and
 * semantically separate from author.isVerified (profile-level) — these
 * render only for a portfolio's own owner/contributor relationship to the
 * GitHub repository it links, and render nothing at all for "none"/missing
 * data (no public negative/"Unverified" badge).
 */

interface GithubVerifiedPillProps {
  verification?: Portfolio["githubVerification"];
  className?: string;
}

const RELATIONSHIP_LABEL: Record<"owner" | "contributor", string> = {
  owner: "Verified Owner",
  contributor: "Verified Contributor",
};

/**
 * Compact "GitHub ✓" repository trust signal for card surfaces — meant to
 * sit in the same badge row as category/showcase pills, not next to the
 * author's avatar/checkmark. Uses CheckBadge (not CheckCircle2, which is
 * author.isVerified's icon) and a neutral/secondary accent so the two trust
 * signals stay visually distinguishable at a glance. The exact relationship
 * (owner vs contributor) is exposed via an accessible hover/focus tooltip —
 * there's no dedicated Tooltip component in this codebase, so this uses the
 * smallest CSS-only (Tailwind group-hover/group-focus) pattern rather than
 * introducing one.
 */
export function GithubVerifiedPill({ verification, className }: GithubVerifiedPillProps) {
  if (!verification || verification.status === "none") return null;
  const label = RELATIONSHIP_LABEL[verification.status as "owner" | "contributor"];

  return (
    <span
      tabIndex={0}
      aria-label={`GitHub — ${label}`}
      className={cn(
        "group relative inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded-md cursor-default focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500",
        className
      )}
    >
      <Github className="w-3 h-3 shrink-0" />
      GitHub
      <CheckBadge className="w-3 h-3 shrink-0 text-sky-600 dark:text-sky-400" />
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-slate-900 dark:bg-white px-2 py-1 text-[10px] font-sans font-medium text-white dark:text-slate-900 opacity-0 scale-95 transition-all duration-100 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100 z-10"
      >
        {label}
      </span>
    </span>
  );
}

interface GithubVerificationLabelProps extends GithubVerifiedPillProps {
  /**
   * "plain" (default) — inline text+icon, no pill chrome.
   * "pill" — same "Verified Owner"/"Verified Contributor" copy, boxed as a
   * small status pill. Used in the submission modal's field label row.
   *
   * Both variants are relied on as-is by the already-approved submission
   * modal — do not change their rendering.
   */
  variant?: "plain" | "pill";
}

/** Spells out "Verified Owner" / "Verified Contributor" — never the generic "GitHub Verified" wording. */
export function GithubVerificationLabel({ verification, className, variant = "plain" }: GithubVerificationLabelProps) {
  if (!verification || verification.status === "none") return null;
  const label = RELATIONSHIP_LABEL[verification.status as "owner" | "contributor"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 shrink-0",
        variant === "pill"
          ? "text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-md"
          : "text-[11px] font-semibold text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      <CheckCircle2 className={variant === "pill" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}

/**
 * Inline "✓ Owner" / "✓ Contributor" fragment meant to be composed INSIDE an
 * existing control (e.g. the detail modal's single GitHub repository link),
 * not as a standalone badge — no box/pill chrome of its own. Renders nothing
 * for "none"/missing verification, matching every other surface.
 */
export function GithubVerificationMark({ verification, className }: GithubVerifiedPillProps) {
  if (!verification || verification.status === "none") return null;
  const word = verification.status === "owner" ? "Owner" : "Contributor";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <CheckBadge className="w-3 h-3 shrink-0 text-sky-600 dark:text-sky-400" />
      {word}
    </span>
  );
}
