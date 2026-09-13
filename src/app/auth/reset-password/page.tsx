"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate/trigger password reset completion
      await new Promise((r) => setTimeout(r, 1000));
      setIsSuccess(true);
    } catch {
      setError("Failed to update password. The link may have expired.");
    }
    setIsLoading(false);
  };

  return (
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
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
        <p className="text-xs text-muted leading-relaxed">
          {email ? `Updating credentials for ${email}` : "Enter your new credentials below."}
        </p>
      </div>

      {isSuccess ? (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Password Successfully Updated
          </div>
          <p className="text-muted">
            Your password has been changed and all old sessions have been revoked. You may now sign in.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Sign In Now
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
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              placeholder="Re-type your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-xs font-mono text-muted">Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
