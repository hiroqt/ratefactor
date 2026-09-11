"use client";

import React, { useState } from "react";
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
  Sparkles,
  ArrowUpRight,
  FileText
} from "lucide-react";
import { DeveloperProfile } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { formatRating } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
    const url = `https://ratefactor.dev/@${profile.username}`;
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
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Public Showcase Live Preview</div>
            <div className="text-[11px] text-slate-300 font-mono">
              ratefactor.dev/@{profile.username}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Public Link</span>
            </>
          )}
        </button>
      </div>

      {/* Simulated Public Page Layout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-8">
        {/* Profile Bio Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-md">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Status Indicator Dot */}
              <span
                className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${
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
                <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                <span className="text-xs font-mono text-slate-500">@{profile.username}</span>
                {profile.pronouns && (
                  <span className="text-[11px] font-mono text-slate-400">({profile.pronouns})</span>
                )}
                {(profile.status.emoji || profile.status.message) && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                    {profile.status.emoji && <span>{profile.status.emoji}</span>}
                    {profile.status.message && (
                      <span className="font-medium truncate max-w-xs">{profile.status.message}</span>
                    )}
                    {profile.status.isBusy && (
                      <span className="text-amber-700 font-mono text-[10px] ml-1">• Busy</span>
                    )}
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-slate-700">{profile.role}</p>

              <p className="text-xs text-slate-600 max-w-xl leading-relaxed break-words [overflow-wrap:anywhere]">{profile.bio}</p>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap pt-1">
                {profile.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {profile.company}
                  </span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-slate-900 hover:underline"
                  >
                    <Globe className="w-3 h-3 text-sky-600" />
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-slate-900"
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
                    className="flex items-center gap-1 text-slate-700 hover:text-slate-900"
                  >
                    <Twitter className="w-3 h-3 text-sky-500" />
                    Twitter
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-slate-700 hover:text-slate-900"
                  >
                    <Linkedin className="w-3 h-3 text-blue-600" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              Joined {profile.joinedDate}
            </span>
          </div>
        </div>

        {/* Pinned Showcase Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-slate-900" />
            <h3 className="font-bold text-slate-900 text-sm">
              Showcase Architectures ({pinnedPortfolios.length})
            </h3>
          </div>

          {pinnedPortfolios.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No architectures pinned to showcase yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pinnedPortfolios.map((p) => {
                const isSpotlight = spotlightPortfolio?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSpotlight
                        ? "bg-slate-50/80 border-slate-900 ring-1 ring-slate-900/10 shadow-sm"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Pin className="w-3 h-3 text-slate-400" />
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{p.title}</h4>
                        </div>
                        {isSpotlight && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300">
                            Spotlight
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2">{p.tagline}</p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                        <span className="text-amber-800 font-semibold">★ {formatRating(p.rating)}</span>
                        <span>{p.likesCount} ♥</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectPortfolio(p)}
                        className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
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

        {/* GitHub Style README.md Section */}
        {profile.readmeMarkdown && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <h3 className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                {profile.username} / README.md
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Public Repository
              </span>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/60 border border-slate-200">
              <MarkdownRenderer content={profile.readmeMarkdown} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
