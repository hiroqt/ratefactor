"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  Pin, 
  Star, 
  Search, 
  Check, 
  AlertCircle, 
  Plus, 
  ExternalLink 
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { Portfolio } from "@/types/portfolio";
import { cn, formatRating } from "@/lib/utils";

interface CustomizePinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPortfolios: Portfolio[];
  pinnedIds: string[];
  spotlightId?: string;
  onSavePins: (pinnedIds: string[], spotlightId?: string) => void;
  onOpenSubmitModal: () => void;
}

const MAX_PINS = 6;

export function CustomizePinsModal({
  isOpen,
  onClose,
  myPortfolios,
  pinnedIds,
  spotlightId,
  onSavePins,
  onOpenSubmitModal,
}: CustomizePinsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(pinnedIds);
  const [currentSpotlight, setCurrentSpotlight] = useState<string | undefined>(spotlightId);
  const [searchQuery, setSearchQuery] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(pinnedIds);
      setCurrentSpotlight(spotlightId || pinnedIds[0]);
      setSearchQuery("");
    }
  }, [isOpen, pinnedIds, spotlightId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Isolate scroll so ONLY the modal content scrolls when cursor is inside modal (matching Notification pattern)
  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [searchQuery, selectedIds.length, currentSpotlight],
  });

  if (!isOpen) return null;

  const handleTogglePin = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((pId) => pId !== id);
      setSelectedIds(next);
      if (currentSpotlight === id) {
        setCurrentSpotlight(next[0] || undefined);
      }
    } else {
      if (selectedIds.length >= MAX_PINS) return;
      const next = [...selectedIds, id];
      setSelectedIds(next);
      if (!currentSpotlight) {
        setCurrentSpotlight(id);
      }
    }
  };

  const handleSelectSpotlight = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedIds.includes(id)) {
      if (selectedIds.length < MAX_PINS) {
        setSelectedIds([...selectedIds, id]);
      } else {
        return;
      }
    }
    setCurrentSpotlight(id);
  };

  const handleSave = () => {
    const validSpotlight = selectedIds.includes(currentSpotlight || "")
      ? currentSpotlight
      : selectedIds[0] || undefined;
    onSavePins(selectedIds, validSpotlight);
    onClose();
  };

  const filteredPortfolios = myPortfolios.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.techStack.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
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
        aria-labelledby="customize-pins-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl bg-white dark:bg-[#121215] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <div>
              <h3 id="customize-pins-title" className="font-bold text-slate-900 dark:text-white text-sm">
                Customize Your Showcase (Pinned Architectures)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select up to {MAX_PINS} portfolios to showcase on your public developer profile.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Counter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#121215] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter your submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={cn(
                "text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold",
                selectedIds.length >= MAX_PINS
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                  : "bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
              )}
            >
              {selectedIds.length} / {MAX_PINS} pinned
            </span>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubmitModal();
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium hover:bg-black dark:hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          </div>
        </div>

        {/* Portfolio List */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-2.5">
          {myPortfolios.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                You haven't submitted any architectures yet. Submit a project to showcase it!
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmitModal();
                }}
                className="px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                + Submit Your First Project
              </button>
            </div>
          ) : filteredPortfolios.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              No matching portfolios found for "{searchQuery}".
            </div>
          ) : (
            filteredPortfolios.map((portfolio) => {
              const isPinned = selectedIds.includes(portfolio.id);
              const isSpotlight = currentSpotlight === portfolio.id;
              const isMaxReached = selectedIds.length >= MAX_PINS && !isPinned;

              return (
                <div
                  key={portfolio.id}
                  onClick={() => !isMaxReached && handleTogglePin(portfolio.id)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none",
                    isPinned
                      ? "bg-slate-50/90 dark:bg-white/[0.04] border-slate-900 dark:border-cyan-500/50 ring-1 ring-slate-900/10 dark:ring-cyan-500/20"
                      : isMaxReached
                      ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10"
                      : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors",
                        isPinned
                          ? "bg-slate-900 dark:bg-cyan-500 border-slate-900 dark:border-cyan-500 text-white dark:text-black"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18181b]"
                      )}
                    >
                      {isPinned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 flex-shrink-0 border border-slate-200 dark:border-white/10">
                      <img
                        src={portfolio.thumbnail}
                        alt={portfolio.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {portfolio.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {portfolio.category}
                        </span>
                        {isSpotlight && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Primary Spotlight
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                        {portfolio.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-amber-800 dark:text-amber-300 font-semibold hidden sm:inline">
                      ★ {formatRating(portfolio.rating)}
                    </span>

                    {/* Spotlight toggle button */}
                    {isPinned && (
                      <button
                        type="button"
                        onClick={(e) => handleSelectSpotlight(portfolio.id, e)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer",
                          isSpotlight
                            ? "bg-amber-500 text-white border-amber-600 dark:border-amber-400"
                            : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                        )}
                        title="Set as Primary Spotlight (featured at top of showcase shelf)"
                      >
                        <Star className={cn("w-3 h-3", isSpotlight && "fill-white")} />
                        <span className="hidden sm:inline">
                          {isSpotlight ? "Spotlight" : "Make Spotlight"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Showcase items appear prominently on your profile shelf.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-full bg-slate-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Save Showcase Pins
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
