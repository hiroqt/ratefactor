"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Pin, 
  Star, 
  Search, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  ExternalLink 
} from "lucide-react";
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  // Isolate scroll so ONLY the modal content scrolls when cursor is inside modal (matching Notification pattern)
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    const scrollEl = scrollRef.current;
    if (!modalEl || !scrollEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();

      const deltaY = e.deltaY;
      const isDirectlyOnScroll = e.target && scrollEl.contains(e.target as Node);

      if (!isDirectlyOnScroll) {
        e.preventDefault();
        scrollEl.scrollTop += deltaY;
        return;
      }

      const atTop = scrollEl.scrollTop <= 0;
      const atBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <= 1;

      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };

    modalEl.addEventListener("wheel", handleWheel, { passive: false });
    modalEl.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      modalEl.removeEventListener("wheel", handleWheel);
      modalEl.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isOpen]);

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
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
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
        className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-slate-700" />
            <div>
              <h3 id="customize-pins-title" className="font-bold text-slate-900 text-sm">
                Customize Your Showcase (Pinned Architectures)
              </h3>
              <p className="text-[11px] text-slate-500">
                Select up to {MAX_PINS} portfolios to showcase on your public developer profile.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Counter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter your submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={cn(
                "text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold",
                selectedIds.length >= MAX_PINS
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-slate-50 text-slate-700 border-slate-200"
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
              className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-black transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          </div>
        </div>

        {/* Portfolio List */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-2.5">
          {myPortfolios.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center">
              <p className="text-xs text-slate-500 mb-3">
                You haven't submitted any architectures yet. Submit a project to showcase it!
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmitModal();
                }}
                className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                + Submit Your First Project
              </button>
            </div>
          ) : filteredPortfolios.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
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
                      ? "bg-slate-50/90 border-slate-900 ring-1 ring-slate-900/10"
                      : isMaxReached
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors",
                        isPinned
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {isPinned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                      <img
                        src={portfolio.thumbnail}
                        alt={portfolio.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {portfolio.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {portfolio.category}
                        </span>
                        {isSpotlight && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Primary Spotlight
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                        {portfolio.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-amber-800 font-semibold hidden sm:inline">
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
                            ? "bg-amber-500 text-white border-amber-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
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
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Showcase items appear prominently on your profile shelf.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-full bg-slate-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Save Showcase Pins
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
