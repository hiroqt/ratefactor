"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  ChevronDown,
  Copy,
  Check,
  Twitter,
} from "@/components/ui/icons";
import { Facebook, Instagram } from "@/components/ui/icons";
import { Linkedin } from "lucide-react";
import { DeveloperProfile } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { useToast } from "@/hooks/useToast";
import { InstagramStoryModal } from "./InstagramStoryModal";
import { cn } from "@/lib/utils";

export interface ProfileShareMenuProps {
  profile: DeveloperProfile;
  portfolios?: Portfolio[];
  className?: string;
  buttonClassName?: string;
  buttonVariant?: "pill-dark" | "pill-white" | "outline" | "compact";
  align?: "left" | "right";
}

export function ProfileShareMenu({
  profile,
  portfolios = [],
  className,
  buttonClassName,
  buttonVariant = "pill-dark",
  align = "right",
}: ProfileShareMenuProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const username = profile.username || "developer";
  const displayName = profile.name || username;

  const getProfileUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/u/${encodeURIComponent(username)}`;
    }
    return `https://ratefactor.dev/u/${username}`;
  }, [username]);

  // Facebook description (catchy, clean, NO EMOJIS)
  const getFacebookQuote = useCallback(() => {
    return `Check out ${displayName}'s software architecture and developer portfolio on RateFactor. Discover verified system designs, engineering showcases, and peer reviews.`;
  }, [displayName]);

  // LinkedIn description (professional, NO EMOJIS)
  const getLinkedInText = useCallback(() => {
    const url = getProfileUrl();
    return `Explore ${displayName}'s verified software architecture portfolio and developer showcases on RateFactor. Review system designs, technical specifications, and engineering peer reviews: ${url}`;
  }, [displayName, getProfileUrl]);

  // X (Twitter) description (clean, NO EMOJIS)
  const getTwitterText = useCallback(() => {
    const url = getProfileUrl();
    return `Check out @${username}'s developer architecture portfolio on @RateFactor:\n${url}`;
  }, [username, getProfileUrl]);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleShareFacebook = () => {
    setIsOpen(false);
    const url = getProfileUrl();
    const quote = getFacebookQuote();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, "_blank", "width=600,height=500,location=no,menubar=no,toolbar=no");
  };

  const handleShareLinkedIn = () => {
    setIsOpen(false);
    const url = getProfileUrl();
    const text = getLinkedInText();
    
    // Copy professional text to clipboard as convenience for the LinkedIn post creator
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success("Professional description copied to clipboard for your LinkedIn post.");
    }

    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, "_blank", "width=600,height=600,location=no,menubar=no,toolbar=no");
  };

  const handleShareTwitter = () => {
    setIsOpen(false);
    const text = getTwitterText();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "width=600,height=500,location=no,menubar=no,toolbar=no");
  };

  const handleOpenInstagramModal = () => {
    setIsOpen(false);
    setIsInstagramModalOpen(true);
  };

  const handleCopyLink = () => {
    const url = getProfileUrl();
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success("Public profile link copied to clipboard!");
      setTimeout(() => {
        setIsCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  // Button styles based on variant
  const getButtonClasses = () => {
    switch (buttonVariant) {
      case "pill-white":
        return "bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs";
      case "outline":
        return "bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-200";
      case "compact":
        return "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs px-2.5 py-1 rounded-lg";
      case "pill-dark":
      default:
        return "bg-[#0f1419] hover:bg-black text-white shadow-2xs";
    }
  };

  return (
    <div ref={menuRef} className={cn("relative inline-block text-left", className)}>
      {/* Share Trigger Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none",
          getButtonClasses(),
          isOpen && "ring-2 ring-indigo-500/50",
          buttonClassName
        )}
      >
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Share</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-white"
          )}
        />
      </button>

      {/* Floating Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-40 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 text-slate-800 dark:text-slate-100 focus:outline-none",
              align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
            )}
          >
            <div className="px-2.5 py-1.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Share Profile Showcase
            </div>

            {/* Facebook Share */}
            <button
              type="button"
              onClick={handleShareFacebook}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Facebook className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  Facebook Post
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Catchy highlight description
                </div>
              </div>
            </button>

            {/* LinkedIn Share */}
            <button
              type="button"
              onClick={handleShareLinkedIn}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Linkedin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  LinkedIn Post
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Professional summary
                </div>
              </div>
            </button>

            {/* Instagram Story Share */}
            <button
              type="button"
              onClick={handleOpenInstagramModal}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/15 via-rose-500/15 to-purple-600/15 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Instagram className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  <span>Instagram Story</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                    Preview
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Embed clean profile card
                </div>
              </div>
            </button>

            {/* X (Twitter) Share */}
            <button
              type="button"
              onClick={handleShareTwitter}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Twitter className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  X (Twitter)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Tweet profile link
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {isCopied ? "Link Copied!" : "Copy Profile Link"}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Copy direct URL to clipboard
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instagram Story Share Modal */}
      <InstagramStoryModal
        isOpen={isInstagramModalOpen}
        onClose={() => setIsInstagramModalOpen(false)}
        profile={profile}
        portfolios={portfolios}
      />
    </div>
  );
}
