"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  showCloseButton?: boolean;
}

const maxWidthStyles: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-[95vw]",
};

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  maxWidth = "2xl",
  showCloseButton = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Isolate scroll so ONLY modal content scrolls when cursor is inside modal
  useEffect(() => {
    if (!isOpen) return;
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            ref={modalRef}
            data-lenis-prevent="true"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.15 }}
            className={cn(
              "relative w-full bg-zinc-900 border border-zinc-750/80 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]",
              maxWidthStyles[maxWidth],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-4 right-4 z-20 p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl transition-colors border border-zinc-700/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-6 pb-4 border-b border-zinc-800/80 flex flex-col gap-1.5 shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg sm:text-xl font-bold text-zinc-100 tracking-tight", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function ModalDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs sm:text-sm text-zinc-400 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function ModalBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-6 overflow-y-auto overscroll-contain flex-1 custom-scrollbar", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-6 pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-3 shrink-0 bg-zinc-900/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
