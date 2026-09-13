"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Github, 
  Twitter, 
  Linkedin, 
  Globe, 
  MapPin, 
  Building2, 
  Star, 
  Pin, 
  Heart, 
  MessageSquare, 
  ArrowUpRight, 
  FileText, 
  Mail, 
  Briefcase, 
  Eye 
} from "@/components/ui/icons";
import { DeveloperProfile } from "@/types/profile";
import { normalizeAvatarUrl } from "@/lib/utils";
import { Portfolio } from "@/types/portfolio";
import { formatRating, formatJoinedDate } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { getEmojiDisplay } from "@/lib/emoji-utils";

interface PublicProfilePreviewProps {
  profile: DeveloperProfile;
  myPortfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
}

export function PublicProfilePreview({
  profile,
  myPortfolios,
  onSelectPortfolio,
}: PublicProfilePreviewProps) {
  const [copied, setCopied] = useState(false);

  const pinnedPortfolios = profile.pinnedPortfolioIds
    .map((id) => myPortfolios.find((p) => p.id === id))
    .filter(Boolean) as Portfolio[];

  const spotlightPortfolio =
    (profile.spotlightPortfolioId &&
      myPortfolios.find((p) => p.id === profile.spotlightPortfolioId)) ||
    pinnedPortfolios[0] ||
    myPortfolios[0] ||
    null;

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/u/${profile.username}` : `https://ratefactor.dev/u/${profile.username}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Public Showcase Live Preview</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Link
            href={`/u/${profile.username}`}
            className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Full Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulated Public Page Layout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/10 shadow-sm space-y-8">
        {/* Profile Bio Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between border-b border-slate-100 dark:border-white/10 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-zinc-800 shadow-md">
                <img
                  src={normalizeAvatarUrl(profile.avatar, profile.username)}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
                  }}
                />
              </div>

              {/* Status Indicator Dot */}
              <span
                className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#121215] ${
                  profile.status.isBusy
                    ? "bg-amber-500"
                    : profile.status.statusType === "offline"
                    ? "bg-slate-400"
                    : "bg-emerald-500"
                }`}
                title={profile.status.isBusy ? "Busy" : "Active"}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">@{profile.username}</span>
                {profile.pronouns && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">({profile.pronouns})</span>
                )}
                {(profile.status.emoji || profile.status.message) && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 flex items-center gap-1">
                    {profile.status.emoji && <span>{profile.status.emoji}</span>}
                    {profile.status.message && (
                      <span className="font-medium truncate max-w-xs">{profile.status.message}</span>
                    )}
                    {profile.status.isBusy && (
                      <span className="text-amber-700 dark:text-amber-400 font-mono text-[10px] ml-1">• Busy</span>
                    )}
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">{profile.role}</p>

              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed break-words [overflow-wrap:anywhere]">{profile.bio}</p>

              {/* Available for Hire Beacon & Contact Trigger */}
              {(profile.availableForHire ?? true) && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-xl">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Available for Hire</span>
                    </div>
                    {profile.customHireMessage && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed truncate">
                        {profile.customHireMessage}
                      </p>
                    )}
                  </div>
                  {(profile.website || profile.github || profile.twitter || profile.linkedin) && (
                    <a
                      href={profile.website || profile.github || profile.twitter || profile.linkedin || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact Developer</span>
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap pt-1">
                {profile.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    {profile.company}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Github className="w-3 h-3" />
                    GitHub
                  </a>
                )}
                {profile.twitter && (
                  <a
                    href={profile.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Twitter className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                    Twitter
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Linkedin className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-700">
              Joined {formatJoinedDate(profile.joinedDate)}
            </span>
          </div>
        </div>

        {/* Pinned Showcase Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-slate-900 dark:text-white" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Showcase Architectures ({pinnedPortfolios.length})
            </h3>
          </div>

          {pinnedPortfolios.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-zinc-500 italic">No architectures pinned to showcase yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pinnedPortfolios.map((p) => {
                const isSpotlight = spotlightPortfolio?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSpotlight
                        ? "bg-slate-50/80 dark:bg-zinc-800/80 border-slate-900 dark:border-zinc-600 ring-1 ring-slate-900/10 dark:ring-white/10 shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-xs"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Pin className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{p.title}</h4>
                        </div>
                        {isSpotlight && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-700">
                            Spotlight
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2">{p.tagline}</p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-zinc-400">
                        <span className="text-amber-800 dark:text-amber-400 font-semibold">★ {formatRating(p.rating)}</span>
                        {p.likesCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="text-xs">{getEmojiDisplay(p.userReaction || "star-struck")}</span>
                            <span>{p.likesCount}</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectPortfolio(p)}
                        className="px-3 py-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-medium hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        Inspect Architecture
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GitHub-Style Activity / Contribution Heatmap */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/10">
          <ActivityHeatmap profile={profile} readOnly={true} />
        </div>

        {/* GitHub Style README.md Section */}
        {profile.readmeMarkdown && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
              <h3 className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                {profile.username} / README.md
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                Public Repository
              </span>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10">
              <MarkdownRenderer content={profile.readmeMarkdown} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
