"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@/components/ui/icons";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-surface shadow-xl space-y-6 text-center">
        <div className="flex items-center gap-2 text-left">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-glass-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-mono text-muted">Back to RateFactor</span>
        </div>

        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Passwordless OAuth Authentication</h1>
          <p className="text-xs text-muted leading-relaxed">
            RateFactor exclusively uses <strong>Google</strong> and <strong>GitHub</strong> OAuth. You don&apos;t have a password to reset or remember!
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted leading-relaxed">
          To access your account, simply sign in using the Google or GitHub profile associated with your email.
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
        >
          Return to Homepage &amp; Sign In
        </Link>
      </div>
    </div>
  );
}

