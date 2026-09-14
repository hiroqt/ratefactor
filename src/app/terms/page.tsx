import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@/components/ui/icons";

export const metadata = {
  title: "Terms of Service — RateFactor",
  description: "Terms and conditions for showcasing and rating developer portfolios on RateFactor.",
};

export default function TermsPage() {
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
            <ShieldCheck className="w-3.5 h-3.5 text-accent-indigo" />
            <span>Terms of Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans">
            Terms of Service
          </h1>
          <p className="text-sm text-muted">
            Last updated: September 2026 · Guidelines for developers and community members.
          </p>
        </header>

        {/* Content Body */}
        <article className="space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              1. Welcome to RateFactor
            </h2>
            <p className="text-muted leading-relaxed">
              RateFactor is a community platform for developers to showcase portfolios, discover creative projects, and exchange constructive code and design feedback. By accessing or using the service, you agree to these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              2. Portfolio Submissions & Content Ownership
            </h2>
            <p className="text-muted leading-relaxed">
              You retain all intellectual property rights to the projects, code, and portfolios you submit. By submitting work to RateFactor, you grant the platform a non-exclusive license to display, feature, and showcase your project in community rankings and Daily/Weekly Showcases.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              3. Community Conduct & Peer Critique
            </h2>
            <p className="text-muted leading-relaxed">
              Critiques, ratings, and comments must be honest, respectful, and constructive. Automated rating manipulation, spamming, self-rating abuse, and harassment are strictly prohibited and may result in account termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              4. Disclaimer & Availability
            </h2>
            <p className="text-muted leading-relaxed">
              RateFactor is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We strive for high uptime and performance, but make no warranties regarding uninterrupted availability.
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-border flex items-center justify-between text-xs text-muted font-mono">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy →
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            © 2026 RateFactor
          </Link>
        </div>
      </div>
    </main>
  );
}
