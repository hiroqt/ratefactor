"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  Terminal, 
  Lock, 
  Mail, 
  User,
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  ShieldCheck,
  Github,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authClient, normalizeUsername } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  intentMessage?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  intentMessage = "Sign in to like, comment, or rate developer portfolios.",
}: AuthModalProps) {
  const [viewMode, setViewMode] = useState<"better_auth" | "otp">("better_auth");
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state (for backward compatibility / 2FA flow)
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewMode === "otp" && otpStep === "verify" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [viewMode, otpStep, countdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      setViewMode("better_auth");
      setAuthTab("signin");
      setError(null);
      setSuccessMsg(null);
      setOtpCode("");
      setDemoCode(null);
      setShowPassword(false);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [viewMode, authTab, error, successMsg],
  });

  if (!isOpen) return null;

  // 1. Better Auth - GitHub OAuth sign-in
  const handleGithubSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initiate GitHub sign-in.");
      setIsLoading(false);
    }
  };

  // 2. Better Auth - Email/Password sign-in and sign-up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      if (authTab === "signup") {
        const res = await authClient.signUp.email({
          email: targetEmail,
          password,
          name: name.trim() || targetEmail.split("@")[0],
        });

        if (res.error) {
          setError(res.error.message || "Failed to create account. Please try again.");
          setIsLoading(false);
          return;
        }

        const u = res.data?.user;
        const authenticatedUser = {
          id: u?.id || "usr_" + Math.random().toString(36).substring(2, 9),
          name: u?.name || name.trim() || targetEmail.split("@")[0],
          email: u?.email || targetEmail,
          avatar: u?.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
          role: (u as any)?.role || "developer",
          username: normalizeUsername(u?.email || targetEmail),
        };

        onAuthSuccess(authenticatedUser);
        onClose();
      } else {
        const res = await authClient.signIn.email({
          email: targetEmail,
          password,
        });

        if (res.error) {
          setError(res.error.message || "Invalid email or password.");
          setIsLoading(false);
          return;
        }

        const u = res.data?.user;
        const authenticatedUser = {
          id: u?.id || "usr_" + Math.random().toString(36).substring(2, 9),
          name: u?.name || targetEmail.split("@")[0],
          email: u?.email || targetEmail,
          avatar: u?.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
          role: (u as any)?.role || "developer",
          username: normalizeUsername(u?.email || targetEmail),
        };

        onAuthSuccess(authenticatedUser);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Authentication error. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fallback OTP challenge request
  const handleRequestOtp = async () => {
    setError(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          provider: "email_password",
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to request OTP code.");
        setIsLoading(false);
        return;
      }

      setChallengeId(data.challengeId);
      if (data.demoCode) {
        setDemoCode(data.demoCode);
      }
      setSuccessMsg(data.message);
      setOtpStep("verify");
      setCountdown(60);
    } catch (err: any) {
      setError("Network error requesting OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fallback OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Invalid OTP verification code.");
        setIsLoading(false);
        return;
      }

      onAuthSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError("Network error during verification.");
    } finally {
      setIsLoading(false);
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
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-md"
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
                  {viewMode === "better_auth"
                    ? authTab === "signin" ? "Sign In to RateFactor" : "Create Developer Account"
                    : otpStep === "request" ? "One-Time Password Sign In" : "Verify Authentication Code"}
                </h3>
                <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                  beta
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">RateFactor Community &bull; Developer Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1 cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Intent banner */}
        {intentMessage && (
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 sm:px-6 py-2.5 flex items-center gap-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium space-y-1.5">
                <p className="leading-relaxed">{successMsg}</p>
                {demoCode && (
                  <div className="flex items-center justify-between bg-white border border-emerald-200/80 rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <span className="font-mono text-[11px] text-emerald-900">
                      Demo OTP Code: <strong>{demoCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(demoCode)}
                      className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      Fill Code
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === "better_auth" ? (
            <div className="space-y-4">
              {/* GitHub OAuth Button */}
              <button
                type="button"
                onClick={handleGithubSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-50 cursor-pointer group"
              >
                <Github className="w-4 h-4 text-slate-900 group-hover:scale-105 transition-transform" />
                <span>Continue with GitHub</span>
              </button>

              <div className="flex items-center my-3.5">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                  or email &amp; password
                </span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Mode Toggle: Sign In vs Sign Up */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                    authTab === "signin"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                    authTab === "signup"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Create Account
                </button>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {authTab === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name / Display Handle
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Satoshi Nakamoto"
                        required={authTab === "signup"}
                        autoComplete="name"
                        className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dev@ratefactor.dev"
                      required
                      autoComplete="email"
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    {authTab === "signup" && (
                      <span className="text-[10px] font-mono text-slate-400">Min 6 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={authTab === "signup" ? "new-password" : "current-password"}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authTab === "signin" ? "Sign In" : "Create Account"}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle to OTP Flow */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("otp");
                    setOtpStep("request");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition font-medium flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Or use 2-Step OTP Verification</span>
                </button>
              </div>
            </div>
          ) : (
            /* OTP Mode */
            <div className="space-y-4">
              {otpStep === "request" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRequestOtp();
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address for OTP
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dev@ratefactor.dev"
                        required
                        className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Code sent to <span className="text-slate-900 font-mono font-semibold">{email}</span>
                    </p>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        autoFocus
                        required
                        className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-3 text-lg font-mono font-bold tracking-[0.4em] text-center text-slate-900 placeholder:text-slate-300 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setOtpStep("request")}
                      className="hover:text-slate-900 transition font-medium cursor-pointer"
                    >
                      &larr; Change email
                    </button>
                    <button
                      type="button"
                      disabled={countdown > 0 || isLoading}
                      onClick={handleRequestOtp}
                      className="text-slate-900 hover:underline disabled:opacity-50 disabled:no-underline font-medium cursor-pointer"
                    >
                      {countdown > 0 ? `Resend code (${countdown}s)` : "Resend Code"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Verify Code &amp; Continue</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("better_auth");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition font-medium cursor-pointer"
                >
                  &larr; Back to GitHub &amp; Password Sign In
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Note */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Protected by RateFactor Auth &bull; End-to-End Encrypted</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

