import React from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, ShieldCheck } from "@/components/ui/icons";

export const metadata = {
  title: "Privacy Policy — RateFactor",
  description: "How RateFactor handles your account data, portfolio submissions, and cookies.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to RateFactor</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="space-y-3 border-b border-border pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-border text-xs font-mono text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans">
            Your Privacy on RateFactor
          </h1>
          <p className="text-sm text-muted">
            Last updated: September 2026 · We believe in transparency and zero ad-tracking.
          </p>
        </header>

        {/* Content Body */}
        <article className="space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              1. The Short Version
            </h2>
            <p className="text-muted leading-relaxed">
              We only collect data necessary to keep RateFactor working: your GitHub/Google profile for authentication, the developer projects you submit, and the reviews, ratings, and comments you leave. We do not sell your personal information, run third-party advertising networks, or track you across the web.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              2. Cookies & Local Storage
            </h2>
            <p className="text-muted leading-relaxed">
              We use first-party cookies only for essential functionality:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted">
              <li><strong>Session Cookies:</strong> Keeping you securely signed in to your developer profile.</li>
              <li><strong>Security & Form Protection:</strong> Preventing spam and cross-site form forgery.</li>
              <li><strong>Preferences:</strong> Remembering your bookmarked portfolios and display modes.</li>
            </ul>
            <p className="text-muted leading-relaxed">
              We do not use advertising or marketing tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              3. Analytics & Telemetry
            </h2>
            <p className="text-muted leading-relaxed">
              We use self-hosted and privacy-first analytics (PostHog) to understand site health and popular showcase projects. You have full control over analytics cookies and can disable them anytime in your cookie settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              4. Your Data Rights
            </h2>
            <p className="text-muted leading-relaxed">
              You retain full ownership of the portfolios and code links you submit. You can delete or edit your submissions, update your profile, or request account removal at any time through your developer dashboard.
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-border flex items-center justify-between text-xs text-muted font-mono">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service →
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            © 2026 RateFactor
          </Link>
        </div>
      </div>
    </main>
  );
}
