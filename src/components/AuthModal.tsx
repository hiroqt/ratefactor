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
  Github
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authClient, normalizeUsername } from "@/lib/auth/client";

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
    deps: [viewMode, authTab],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-neutral-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-sm font-semibold text-white tracking-wide">
                {viewMode === "better_auth"
                  ? authTab === "signin" ? "Developer Sign In" : "Create Developer Account"
                  : otpStep === "request" ? "Request OTP" : "Verify Code"}
              </h3>
              <p className="text-[11px] text-neutral-400">RateFactor Community &bull; Secure Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Intent banner */}
        {intentMessage && (
          <div className="bg-orange-500/10 border-b border-orange-500/20 px-6 py-2.5 flex items-center space-x-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300">{intentMessage}</p>
          </div>
        )}

        <div ref={scrollRef} data-lenis-prevent="true" className="p-6 overflow-y-auto overscroll-contain flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-300">
                <p>{successMsg}</p>
                {demoCode && (
                  <p className="mt-1 font-mono text-[11px] text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded inline-block">
                    Demo OTP Code: <strong>{demoCode}</strong>
                  </p>
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
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white text-neutral-900 font-medium text-sm rounded-xl hover:bg-neutral-100 transition shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Github className="w-4 h-4 text-neutral-900" />
                <span>Continue with GitHub</span>
              </button>

              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-white/10" />
                <span className="px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-mono">
                  or email &amp; password
                </span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              {/* Mode Toggle: Sign In vs Sign Up */}
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    authTab === "signin"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                    authTab === "signup"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authTab === "signup" && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        required={authTab === "signup"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dev@ratefactor.dev"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center space-x-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authTab === "signin" ? "Sign In" : "Register Account"}</span>
                      <ArrowRight className="w-4 h-4" />
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
                  className="text-xs text-neutral-400 hover:text-orange-400 transition"
                >
                  Or use 2-Step OTP Verification
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
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Email Address for OTP
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dev@ratefactor.dev"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <p className="text-[11px] text-neutral-400 mb-3">
                      Sent to <span className="text-white font-mono">{email}</span>.
                    </p>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-orange-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        autoFocus
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-lg font-mono tracking-widest text-center text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setOtpStep("request")}
                      className="hover:text-white transition"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      disabled={countdown > 0 || isLoading}
                      onClick={handleRequestOtp}
                      className="text-orange-400 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {countdown > 0 ? `Resend code (${countdown}s)` : "Resend Code"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-orange-600/20 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify Code &amp; Enter</span>
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
                  className="text-xs text-neutral-400 hover:text-orange-400 transition"
                >
                  &larr; Back to GitHub &amp; Password Sign In
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center space-x-2 text-[11px] text-neutral-500">
            <Lock className="w-3 h-3" />
            <span>Protected by Secure Authentication &bull; End-to-End Encrypted</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
