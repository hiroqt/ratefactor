"use client";

import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { DeveloperDashboard } from "./dashboard/DeveloperDashboard";

interface DeveloperDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: DeveloperProfile;
  onUpdateProfile?: (updatedProfile: DeveloperProfile) => void;
  myPortfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
  onDeletePortfolio: (id: string) => void;
  onOpenSubmitModal: () => void;
}

export function DeveloperDashboardModal({
  isOpen,
  onClose,
  profile: propProfile,
  onUpdateProfile: propOnUpdateProfile,
  myPortfolios,
  onSelectPortfolio,
  onDeletePortfolio,
  onOpenSubmitModal,
}: DeveloperDashboardModalProps) {
  const [internalProfile, setInternalProfile] = useState<DeveloperProfile>(
    propProfile ?? INITIAL_DEVELOPER_PROFILE
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propProfile) {
      setInternalProfile(propProfile);
    }
  }, [propProfile]);

  const handleUpdateProfile = (updated: DeveloperProfile) => {
    setInternalProfile(updated);
    if (propOnUpdateProfile) {
      propOnUpdateProfile(updated);
    }
  };

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
        aria-labelledby="dashboard-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Close Dashboard"
            aria-label="Close Dashboard"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Dashboard Body */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-3.5 sm:p-8 overflow-y-auto overscroll-contain flex-1 w-full min-w-0 max-w-full">
          <DeveloperDashboard
            profile={internalProfile}
            onUpdateProfile={handleUpdateProfile}
            myPortfolios={myPortfolios}
            onSelectPortfolio={(p) => {
              onClose();
              onSelectPortfolio(p);
            }}
            onDeletePortfolio={onDeletePortfolio}
            onOpenSubmitModal={() => {
              onClose();
              onOpenSubmitModal();
            }}
            onClose={onClose}
          />
        </div>

        {/* Bottom Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[11px] truncate">
            RateFactor Developer Console • @{internalProfile.username}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-black transition-colors self-end sm:self-auto cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
