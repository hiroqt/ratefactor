"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  Mail, 
  User, 
  KeyRound, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Github, 
  Eye, 
  EyeOff, 
  ArrowLeft 
} from "@/components/ui/icons";
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
  const [viewMode, setViewMode] = useState<"credentials" | "otp">("credentials");
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP Verification state (5-minute lifecycle)
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes = 300 seconds
  const [resendCooldown, setResendCooldown] = useState(60);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // 5-minute Countdown Timer & 60s Resend Cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewMode === "otp" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [viewMode, countdown]);

  // Keyboard accessibility
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

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setViewMode("credentials");
      setAuthTab("signin");
      setError(null);
      setSuccessMsg(null);
      setOtpCode("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [viewMode, authTab, error, successMsg],
  });

  if (!isOpen) return null;

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 1. GitHub OAuth Sign-In
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

  // 2. Submit Sign In or Initiate Sign Up OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // SIGN UP FLOW: Validate password match and request 5-minute email OTP
    if (authTab === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify both password fields.");
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetEmail,
            name: name.trim() || targetEmail.split("@")[0],
            password,
            purpose: "signup",
            provider: "email_password",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Failed to dispatch verification code.");
          setIsLoading(false);
          return;
        }

        setChallengeId(data.challengeId);
        setSuccessMsg(`A 6-digit verification code was sent to ${targetEmail}.`);
        setViewMode("otp");
        setCountdown(300); // 5 minutes
        setResendCooldown(60);
        setOtpCode("");

        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
      } catch (err: any) {
        setError("Network error requesting verification code.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // SIGN IN FLOW: Direct authentication via Better Auth
    setIsLoading(true);
    try {
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
    } catch (err: any) {
      setError(err?.message || "Authentication error. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || email.trim().split("@")[0],
          password,
          purpose: "signup",
          provider: "email_password",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to resend code.");
        setIsLoading(false);
        return;
      }

      setChallengeId(data.challengeId);
      setSuccessMsg(`New 6-digit verification code sent to ${email.trim()}.`);
      setCountdown(300); // Reset 5 minutes
      setResendCooldown(60);
      setOtpCode("");
    } catch (err: any) {
      setError("Failed to resend code. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify OTP Code and complete registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
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
        setError(data.detail || "Invalid or expired verification code.");
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

  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

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
                  {viewMode === "credentials"
                    ? authTab === "signin" ? "Sign In to RateFactor" : "Create Developer Account"
                    : "Verify Your Email"}
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

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed flex-1 font-medium">{successMsg}</p>
            </div>
          )}

          {viewMode === "credentials" ? (
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
              <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
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
                        placeholder="Alex Rivera"
                        required
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
                      placeholder="alex@ratefactor.dev"
                      required
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
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

                {/* Confirm Password Field (Sign Up Only) */}
                {authTab === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Confirm Password</span>
                      {isPasswordMatch && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </span>
                      )}
                      {isPasswordMismatch && (
                        <span className="text-[11px] text-rose-500 font-medium">
                          Passwords do not match
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        required
                        className={cn(
                          "w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all",
                          isPasswordMismatch
                            ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                            : isPasswordMatch
                            ? "border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                            : "border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (authTab === "signup" && isPasswordMismatch)}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authTab === "signin" ? "Sign In" : "Continue with Email Verification"}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* OTP 5-Minute Email Verification Screen */
            <div className="space-y-4">
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Check your inbox</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    We sent a 6-digit verification code to{" "}
                    <strong className="text-slate-900 font-mono">{email}</strong>
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono text-slate-700">
                    <span className={countdown <= 60 ? "text-rose-600 font-bold animate-pulse" : "text-slate-900 font-bold"}>
                      ⏱️ {formatTime(countdown)}
                    </span>
                    <span className="text-[11px] text-slate-400">remaining</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative max-w-[280px] mx-auto">
                    <input
                      ref={otpInputRef}
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtpCode(val);
                      }}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl px-4 py-3 text-2xl font-mono font-extrabold tracking-[0.4em] text-center text-slate-900 placeholder:text-slate-300 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("credentials");
                      setError(null);
                    }}
                    className="hover:text-slate-900 transition font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit details</span>
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-slate-900 hover:underline disabled:opacity-50 disabled:no-underline font-medium cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6 || countdown === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Verify &amp; Create Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AuthModal;

