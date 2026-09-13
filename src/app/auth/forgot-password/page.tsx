"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      // Simulate/trigger password recovery flow
      await new Promise((r) => setTimeout(r, 1000));
      setIsSubmitted(true);
    } catch {
      setError("Failed to initiate password recovery. Please verify your email.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-glass-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-mono text-muted">Back to RateFactor</span>
        </div>

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Password Recovery</h1>
          <p className="text-xs text-muted leading-relaxed">
            Enter your primary account email address. If an account exists, we will dispatch a secure 24-hour reset link.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Reset Email Dispatched
            </div>
            <p className="text-muted leading-relaxed">
              Check your inbox at <strong className="text-foreground">{email}</strong> for instructions to reset your password.
            </p>
            <Link
              href="/"
              className="inline-block pt-2 text-brand-600 dark:text-brand-400 font-semibold hover:underline text-xs"
            >
              Return to Homepage
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
            >
              {isLoading ? "Dispatching..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
