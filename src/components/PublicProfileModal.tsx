"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { X, User, ExternalLink } from "@/components/ui/icons";
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

import { createProfileFromAuthor } from "@/lib/profile-utils";
export { createProfileFromAuthor };

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
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md modal-backdrop"
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
        className="relative w-full max-w-5xl bg-slate-50 dark:bg-[#09090b] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215] shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-zinc-400">
            <User className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <span id="public-profile-modal-title" className="font-semibold text-slate-900 dark:text-white">
              @{userProfile.username}
            </span>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <span>Public Profile Preview</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/u/${userProfile.username}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-medium transition-colors"
            >
              <span>Open Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
