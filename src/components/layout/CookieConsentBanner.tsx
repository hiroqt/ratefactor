"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getClientCookieConsent, setClientCookieConsent, CookieConsent } from "@/lib/cookies";
import {
  Cookie,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Lock,
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "@/components/ui/icons";

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [preferencesEnabled, setPreferencesEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);

    // 1. Check if user already picked preferences
    const existingConsent = getClientCookieConsent();
    if (!existingConsent) {
      setIsVisible(true);
    } else {
      setAnalyticsEnabled(existingConsent.analytics);
    }

    // Check for query param ?cookies=true or hash #cookies to easily view or test
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("cookies") === "true" || window.location.hash === "#cookies") {
        setIsVisible(true);
        setIsCustomizeOpen(true);
      }
    }

    // 2. Global event listener to reopen settings from Footer or Floating Button
    const handleOpenPreferences = () => {
      const current = getClientCookieConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
      }
      setIsCustomizeOpen(true);
      setIsVisible(true);
    };

    window.addEventListener("rf_open_cookie_preferences", handleOpenPreferences);
    return () => {
      window.removeEventListener("rf_open_cookie_preferences", handleOpenPreferences);
    };
  }, []);

  const dispatchConsentUpdate = (analytics: boolean) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rf_cookie_consent_updated", { detail: { analytics } })
      );
    }
  };

  const handleAcceptAll = () => {
    const consent: CookieConsent = {
      status: "accepted",
      analytics: true,
      timestamp: new Date().toISOString(),
    };
    setClientCookieConsent(consent);
    setAnalyticsEnabled(true);
    setPreferencesEnabled(true);
    setIsVisible(false);
    setIsCustomizeOpen(false);
    dispatchConsentUpdate(true);
  };

  const handleEssentialOnly = () => {
    const consent: CookieConsent = {
      status: "essential_only",
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    setClientCookieConsent(consent);
    setAnalyticsEnabled(false);
    setIsVisible(false);
    setIsCustomizeOpen(false);
    dispatchConsentUpdate(false);
  };

  const handleSaveCustom = () => {
    const consent: CookieConsent = {
      status: analyticsEnabled ? "accepted" : "essential_only",
      analytics: analyticsEnabled,
      timestamp: new Date().toISOString(),
    };
    setClientCookieConsent(consent);
    setIsVisible(false);
    setIsCustomizeOpen(false);
    dispatchConsentUpdate(analyticsEnabled);
  };

  const handleReset = () => {
    if (typeof document !== "undefined") {
      document.cookie = "rf_consent=; Max-Age=0; path=/;";
    }
    setAnalyticsEnabled(true);
    setPreferencesEnabled(true);
    setIsCustomizeOpen(false);
    setIsVisible(true);
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. Persistent Floating Button (Always available in the corner) */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            key="rf-cookie-pill-badge"
            type="button"
            onClick={() => {
              setIsCustomizeOpen(true);
              setIsVisible(true);
            }}
            aria-label="Open Cookie Settings"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 z-[9990] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/90 hover:bg-surface border border-border/80 hover:border-amber-500/40 text-foreground text-xs font-medium shadow-glass-modal backdrop-blur-xl transition-all cursor-pointer group select-none"
          >
            <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Cookie className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-muted group-hover:text-foreground transition-colors font-sans">
              Cookies
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 2. Main Friendly Cookie Preferences Dialog */}
      <AnimatePresence>
        {isVisible && (
          <motion.aside
            key="ratefactor-cookie-consent-dialog"
            role="dialog"
            aria-label="Cookie preferences"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] p-4 sm:p-5 rounded-2xl border border-border/80 bg-surface/95 backdrop-blur-2xl shadow-glass-modal text-foreground select-none"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Cookie className="w-5 h-5" />
                </div>
                <div className="text-xs text-muted leading-relaxed">
                  <p>
                    <strong className="text-foreground font-semibold">We use cookies.</strong>{" "}
                    Only the ones that keep RateFactor working: keeping you signed in, saving your bookmarked portfolios, and protecting community ratings. Built for developers, zero ads.{" "}
                    <Link
                      href="/privacy"
                      className="text-foreground underline underline-offset-2 hover:text-amber-500 transition-colors font-medium cursor-pointer"
                    >
                      Privacy policy
                    </Link>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEssentialOnly}
                aria-label="Close and use necessary only"
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Granular Customization Panel (Accordion) */}
            <AnimatePresence initial={false}>
              {isCustomizeOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-4 pt-3 border-t border-border/80 space-y-2.5"
                >
                  {/* 1. Necessary */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised/70 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Necessary for the site</p>
                        <p className="text-[11px] text-muted">Keeps your developer account signed in and protects ratings</p>
                      </div>
                    </div>
                    <span className="font-sans text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0 uppercase tracking-wide">
                      Always on
                    </span>
                  </div>

                  {/* 2. Site improvements */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised/70 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-accent-cyan shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Site improvements</p>
                        <p className="text-[11px] text-muted">Helps us see popular developer portfolios and improve discovery</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={analyticsEnabled}
                      onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${analyticsEnabled ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted/40"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${analyticsEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {/* 3. Saved preferences */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised/70 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <SlidersHorizontal className="w-4 h-4 text-accent-indigo shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Remember my view</p>
                        <p className="text-[11px] text-muted">Saves your bookmarked portfolios and preferred showcase layout</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferencesEnabled}
                      onClick={() => setPreferencesEnabled(!preferencesEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${preferencesEnabled ? "bg-emerald-600 dark:bg-emerald-500" : "bg-muted/40"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${preferencesEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {/* Reset option */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset my choices</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground font-medium transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isCustomizeOpen ? "Hide options" : "Choose options"}</span>
                {isCustomizeOpen ? (
                  <ChevronUp className="w-3 h-3 opacity-60" />
                ) : (
                  <ChevronDown className="w-3 h-3 opacity-60" />
                )}
              </button>

              <div className="flex items-center gap-2">
                {isCustomizeOpen ? (
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save my choices</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleEssentialOnly}
                      className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border hover:border-border-hover text-muted hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                    >
                      Only necessary
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptAll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept all</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
