"use client";

import React from "react";
import { Terminal, Github, Heart, ShieldCheck, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-surface text-muted text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-surface-raised border border-border flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <span className="font-mono font-bold text-foreground text-sm">
                Rate<span className="text-brand-400">Factor</span>
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Developer-first platform for discovering, showcasing, rating, and discussing developer portfolios.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-accent-emerald">
              <span className="w-2 h-2 rounded-full bg-accent-emerald" />
              <span>All systems operational • $0 infra MVP</span>
            </div>
          </div>

          {/* Discovery */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-foreground font-semibold tracking-wider">
              Discovery
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Daily Showcase</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Weekly Champions</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Systems & Rust Engines</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Creative WebGL Shaders</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Fullstack Architectures</span></li>
            </ul>
          </div>

          {/* Standards */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-foreground font-semibold tracking-wider">
              Peer Review Criteria
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li><span className="text-muted/80">Code Quality & Architecture</span></li>
              <li><span className="text-muted/80">Benchmark Reproducibility</span></li>
              <li><span className="text-muted/80">Memory Safety & Resource Bounds</span></li>
              <li><span className="text-muted/80">Visual UX & Keyboard Accessibility</span></li>
              <li><span className="text-muted/80">Zero AI-Slop Guidelines</span></li>
            </ul>
          </div>

          {/* Tech Stack specs */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-foreground font-semibold tracking-wider">
              Architecture (PRD v1.0)
            </h4>
            <div className="space-y-1 text-[11px] font-mono text-muted">
              <div>Frontend: Next.js 15 App Router</div>
              <div>Styling: Tailwind CSS + Park UI</div>
              <div>Backend: Supabase PostgreSQL + RLS</div>
              <div>Realtime: Supabase WebSocket</div>
              <div>Hosting: Vercel ($0 Tier)</div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <div>
            © {new Date().getFullYear()} RateFactor. Built for engineers who care about code.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Review</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Status Page</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
