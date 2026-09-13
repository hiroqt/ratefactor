"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "@/components/ui/icons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
}

const typeStyles: Record<
  ToastType,
  {
    border: string;
    badgeBg: string;
    badgeBorder: string;
    iconColor: string;
    progressBar: string;
    glow: string;
    icon: React.ReactNode;
    defaultTitle: string;
  }
> = {
  info: {
    border: "border-sky-500/60",
    badgeBg: "bg-sky-500/20",
    badgeBorder: "border-sky-400/50",
    iconColor: "text-sky-400",
    progressBar: "bg-gradient-to-r from-sky-400 to-cyan-400",
    glow: "shadow-[0_10px_35px_-5px_rgba(14,165,233,0.35),0_0_15px_rgba(14,165,233,0.2)]",
    icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
    defaultTitle: "Notice",
  },
  success: {
    border: "border-emerald-500/60",
    badgeBg: "bg-emerald-500/20",
    badgeBorder: "border-emerald-400/50",
    iconColor: "text-emerald-400",
    progressBar: "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400",
    glow: "shadow-[0_10px_35px_-5px_rgba(16,185,129,0.35),0_0_15px_rgba(16,185,129,0.2)]",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    defaultTitle: "Success",
  },
  warning: {
    border: "border-amber-500/60",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-400/50",
    iconColor: "text-amber-400",
    progressBar: "bg-gradient-to-r from-amber-400 to-yellow-300",
    glow: "shadow-[0_10px_35px_-5px_rgba(245,158,11,0.35),0_0_15px_rgba(245,158,11,0.2)]",
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    defaultTitle: "Warning",
  },
  error: {
    border: "border-rose-500/60",
    badgeBg: "bg-rose-500/20",
    badgeBorder: "border-rose-400/50",
    iconColor: "text-rose-400",
    progressBar: "bg-gradient-to-r from-rose-500 to-pink-400",
    glow: "shadow-[0_10px_35px_-5px_rgba(244,63,94,0.35),0_0_15px_rgba(244,63,94,0.2)]",
    icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    defaultTitle: "Alert",
  },
};

export function Toast({
  type = "info",
  title,
  message,
  duration = 4000,
  action,
  onClose,
  className,
}: ToastProps) {
  const config = typeStyles[type] || typeStyles.info;
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef<number>(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Stable countdown timer that does not re-trigger on parent re-renders
  useEffect(() => {
    if (duration <= 0) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = 30;
    timerRef.current = setInterval(() => {
      remainingTimeRef.current -= interval;
      const pct = Math.max(0, (remainingTimeRef.current / duration) * 100);
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onCloseRef.current?.();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duration, isPaused]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      role="alert"
      aria-live="polite"
      className={cn(
        "relative flex items-start gap-3.5 p-4 rounded-2xl bg-[#0b0f19] border text-white shadow-2xl pointer-events-auto overflow-hidden transition-shadow select-none",
        config.border,
        config.glow,
        className
      )}
    >
      {/* Top Specular Edge Highlight */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      {/* Glowing Status Icon Badge */}
      <div
        className={cn(
          "p-2 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
          config.badgeBg,
          config.badgeBorder
        )}
      >
        {config.icon}
      </div>

      {/* Message and Content */}
      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <h4 className="text-xs font-bold text-white tracking-tight mb-0.5">
            {title}
          </h4>
        )}
        <p className="text-[13px] font-medium leading-snug text-slate-100 break-words [overflow-wrap:anywhere]">
          {message}
        </p>

        {/* Action Button if specified */}
        {action && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              onCloseRef.current?.();
            }}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-all cursor-pointer"
          >
            <span>{action.label}</span>
          </button>
        )}
      </div>

      {/* Close Dismiss Button */}
      {onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCloseRef.current?.();
          }}
          aria-label="Dismiss toast"
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Dynamic Animated Duration Progress Countdown Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-900/90 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-75 ease-linear",
              config.progressBar
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
