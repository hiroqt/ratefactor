"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface HireSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  showLabel?: boolean;
  labelPosition?: "left" | "right";
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
  id?: string;
}

const SIZE_CONFIGS = {
  sm: {
    track: "h-5 w-9 p-0.5",
    thumb: "h-4 w-4",
    travel: 16,
    dot: "h-1.5 w-1.5",
    fontSize: "text-[11px]",
    beaconSize: "h-2 w-2",
  },
  md: {
    track: "h-6 w-11 p-0.5",
    thumb: "h-5 w-5",
    travel: 20,
    dot: "h-2 w-2",
    fontSize: "text-xs",
    beaconSize: "h-2.5 w-2.5",
  },
  lg: {
    track: "h-7.5 w-14 p-1",
    thumb: "h-5.5 w-5.5",
    travel: 26,
    dot: "h-2.5 w-2.5",
    fontSize: "text-sm",
    beaconSize: "h-3 w-3",
  },
};

export function HireSwitch({
  checked,
  onChange,
  size = "md",
  disabled = false,
  showLabel = false,
  labelPosition = "left",
  activeLabel = "Available for Hire",
  inactiveLabel = "Not for Hire",
  className,
  id,
}: HireSwitchProps) {
  const config = SIZE_CONFIGS[size];

  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const labelElement = showLabel && (
    <div className="flex items-center gap-2 select-none cursor-pointer" onClick={handleToggle}>
      <span className={cn("relative flex shrink-0", config.beaconSize)}>
        {checked && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full transition-colors duration-300",
            config.beaconSize,
            checked ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-300"
          )}
        />
      </span>
      <span
        className={cn(
          "font-semibold transition-colors duration-200 tracking-tight",
          config.fontSize,
          checked ? "text-slate-900" : "text-slate-500"
        )}
      >
        {checked ? activeLabel : inactiveLabel}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {labelPosition === "left" && labelElement}

      <motion.button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={checked ? activeLabel : inactiveLabel}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        whileHover={disabled ? undefined : { scale: 1.03 }}
        className={cn(
          "relative inline-flex items-center rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shrink-0",
          config.track,
          checked
            ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.35)] border border-emerald-400/50"
            : "bg-slate-200/90 hover:bg-slate-300/90 shadow-inner border border-slate-300/80"
        )}
      >
        {/* Glow halo behind track when active */}
        {checked && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xs pointer-events-none"
          />
        )}

        {/* Sliding Fluid Thumb with Spring Physics */}
        <motion.span
          layout
          transition={{
            type: "spring",
            stiffness: 550,
            damping: 32,
            mass: 0.8,
          }}
          animate={{
            x: checked ? config.travel : 0,
          }}
          className={cn(
            "relative flex items-center justify-center rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.12)] border border-white/80 transition-shadow",
            config.thumb
          )}
        >
          {/* Inner status glyph */}
          <AnimatePresence mode="wait" initial={false}>
            {checked ? (
              <motion.span
                key="checked-glyph"
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex items-center justify-center text-emerald-600"
              >
                <span className={cn("rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]", config.dot)} />
              </motion.span>
            ) : (
              <motion.span
                key="unchecked-glyph"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center text-slate-400"
              >
                <span className={cn("rounded-full bg-slate-300", config.dot)} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
      </motion.button>

      {labelPosition === "right" && labelElement}
    </div>
  );
}
