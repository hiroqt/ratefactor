"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { onNetworkStatusChange, NetworkStatus } from "@/lib/network";

export function NetworkStatusBanner() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>({
    online: true,
    isSlow: false,
    effectiveType: "4g",
    saveData: false,
  });
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    return onNetworkStatusChange((newStatus) => {
      setStatus((prev) => {
        if (!prev.online && newStatus.online) {
          setWasOffline(true);
          setShowRestored(true);
          setDismissed(false);
          setTimeout(() => setShowRestored(false), 3000);
        }
        return newStatus;
      });
    });
  }, []);

  if (!mounted || dismissed) return null;

  // Offline banner
  if (!status.online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
            <WifiOff className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight truncate">Offline Mode Active</p>
            <p className="text-[11px] text-slate-300 leading-tight truncate">
              Browsing cached portfolios. Sync resumes automatically when reconnected.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer shrink-0"
          aria-label="Dismiss offline notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Restored banner
  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-950 text-emerald-100 shadow-xl border border-emerald-700/60 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium">Internet connection restored.</p>
        </div>
      </div>
    );
  }

  // Slow connection banner
  if (status.isSlow) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-950/90 text-amber-100 shadow-xl border border-amber-700/60 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-200 leading-tight truncate">
            Slow network ({status.effectiveType.toUpperCase()}). High-efficiency mode enabled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-400 hover:text-white rounded-md transition cursor-pointer shrink-0"
          aria-label="Dismiss slow network alert"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return null;
}
