"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Github, 
  Google 
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: any) => void;
  intentMessage?: string;
  callbackURL?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  intentMessage = "Sign in to like, comment, or rate developer portfolios.",
  callbackURL,
}: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsLoading(false);
      setLoadingProvider(null);
    }
  }, [isOpen]);

  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [error, isLoading],
  });

  if (!isOpen) return null;

  // 1. Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    setLoadingProvider("google");
    try {
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const currentPath = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/";
      const cleanPath = currentPath.replace(/[?&]new=true/g, "").replace(/[?&]onboarding=true/g, "");
      const redirectUrl = callbackURL || (currentOrigin ? `${currentOrigin}${cleanPath || "/"}` : "/");
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectUrl,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Google sign-in. Please try again.");
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  // 2. GitHub OAuth Sign-In
  const handleGithubSignIn = async () => {
    setError(null);
    setIsLoading(true);
    setLoadingProvider("github");
    try {
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const currentPath = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/";
      const cleanPath = currentPath.replace(/[?&]new=true/g, "").replace(/[?&]onboarding=true/g, "");
      const redirectUrl = callbackURL || (currentOrigin ? `${currentOrigin}${cleanPath || "/"}` : "/");
      await authClient.signIn.social({
        provider: "github",
        callbackURL: redirectUrl,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initiate GitHub sign-in. Please try again.");
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md modal-backdrop"
      />

      {/* Modal Card */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden z-10 text-slate-900 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top ambient highlight */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 id="auth-modal-title" className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  Sign In to RateFactor
                </h3>
                <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                  oauth
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">RateFactor Community &bull; Developer Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1 cursor-pointer shrink-0 disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Intent banner */}
        {intentMessage && (
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 sm:px-6 py-2.5 flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium leading-tight">{intentMessage}</p>
          </div>
        )}

        {/* Content Body */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed flex-1 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center pb-1">
              <p className="text-xs text-slate-500">
                Continue with your verified developer profile. No passwords or OTP codes required.
              </p>
            </div>

            {/* Google OAuth Card */}
            <button
              id="continue-with-google-btn"
              data-testid="continue-with-google-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white font-semibold text-sm rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer group",
                loadingProvider === "google" && "bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600"
              )}
            >
              {loadingProvider === "google" ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
              ) : (
                <Google className="w-4 h-4 group-hover:scale-105 transition-transform shrink-0" />
              )}
              <span>{loadingProvider === "google" ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* GitHub OAuth Card */}
            <button
              id="continue-with-github-btn"
              data-testid="continue-with-github-btn"
              type="button"
              onClick={handleGithubSignIn}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-white font-semibold text-sm rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer group",
                loadingProvider === "github" && "bg-slate-50 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600"
              )}
            >
              {loadingProvider === "github" ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
              ) : (
                <Github className="w-4 h-4 text-slate-900 dark:text-white group-hover:scale-105 transition-transform shrink-0" />
              )}
              <span>{loadingProvider === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
            </button>

            {/* Security & Passwordless Notice */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-2.5 text-left bg-slate-50 rounded-xl p-3 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Secure OAuth 2.0 Sign-In.</span> RateFactor strictly uses Google and GitHub for identity verification. We never store passwords or access private repositories.
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-400 pt-1 leading-relaxed">
              By continuing, you agree to RateFactor&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthModal;

