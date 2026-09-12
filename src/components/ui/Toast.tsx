"use client";

import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastProps {
  id?: string;
  type?: ToastType;
  message: string;
  onClose?: () => void;
  className?: string;
}

const typeStyles: Record<ToastType, { border: string; text: string; bg: string; icon: React.ReactNode }> = {
  info: {
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  },
  success: {
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  },
  warning: {
    border: "border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  },
  error: {
    border: "border-rose-500/30",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  },
};

export function Toast({
  type = "info",
  message,
  onClose,
  className,
}: ToastProps) {
  const config = typeStyles[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/95 border backdrop-blur-md shadow-2xl text-xs sm:text-sm text-zinc-200 pointer-events-auto",
        config.border,
        className
      )}
    >
      <div className={cn("p-1.5 rounded-lg", config.bg)}>
        {config.icon}
      </div>
      <p className="flex-1 font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}
