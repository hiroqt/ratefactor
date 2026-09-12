"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { X, User, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { PublicProfilePreview } from "./dashboard/PublicProfilePreview";

export interface PublicProfileModalProps {
  userProfile: DeveloperProfile | null;
  isOpen: boolean;
  onClose: () => void;
  userPortfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
}

export function createProfileFromAuthor(
  author: { name: string; username: string; avatar?: string; role?: string; isVerified?: boolean },
  portfolios: Portfolio[],
  baseProfile?: DeveloperProfile
): DeveloperProfile {
  const authorPortfolios = portfolios.filter(
    (p) =>
      p.author?.username?.toLowerCase() === author.username.toLowerCase() ||
      p.author?.name?.toLowerCase() === author.name.toLowerCase()
  );

  const allSkills = Array.from(new Set(authorPortfolios.flatMap((p) => p.techStack || [])));

  if (baseProfile && baseProfile.username.toLowerCase() === author.username.toLowerCase()) {
    return {
      ...baseProfile,
      pinnedPortfolioIds:
        baseProfile.pinnedPortfolioIds.length > 0
          ? baseProfile.pinnedPortfolioIds
          : authorPortfolios.slice(0, 6).map((p) => p.id),
      spotlightPortfolioId: baseProfile.spotlightPortfolioId || authorPortfolios[0]?.id,
      skills: baseProfile.skills.length > 0 ? baseProfile.skills : allSkills,
    };
  }

  return {
    id: `profile-${author.username}`,
    name: author.name,
    username: author.username.replace(/^@/, ""),
    avatar:
      author.avatar ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    role: author.role || "Fullstack Architect",
    bio: `${author.name} is a developer and builder showcasing architectures on RateFactor.`,
    status: {
      emoji: "⚡",
      message: "Building architectures",
      statusType: "available",
    },
    github: `https://github.com/${author.username.replace(/^@/, "")}`,
    pinnedPortfolioIds: authorPortfolios.slice(0, 6).map((p) => p.id),
    spotlightPortfolioId: authorPortfolios[0]?.id,
    skills: allSkills.length > 0 ? allSkills : ["TypeScript", "Next.js", "React"],
    joinedDate: authorPortfolios[0]?.createdAt || new Date().toISOString(),
  };
}

export function PublicProfileModal({
  userProfile,
  isOpen,
  onClose,
  userPortfolios,
  onSelectPortfolio,
}: PublicProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [userProfile?.username, userPortfolios.length],
  });

  if (!isOpen || !userProfile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-profile-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span id="public-profile-modal-title" className="font-semibold text-slate-900">
              @{userProfile.username}
            </span>
            <span className="text-slate-300">•</span>
            <span>Public Profile Preview</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/u/${userProfile.username}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
            >
              <span>Open Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Close public profile modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          data-lenis-prevent="true"
          className="p-4 sm:p-8 overflow-y-auto overscroll-contain flex-1 w-full min-w-0 max-w-full"
        >
          <PublicProfilePreview
            profile={userProfile}
            myPortfolios={userPortfolios}
            onSelectPortfolio={(p) => {
              onSelectPortfolio(p);
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
