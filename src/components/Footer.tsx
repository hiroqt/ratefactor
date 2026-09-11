"use client";

import React from "react";
import { Terminal, Github, Heart, ShieldCheck, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5 text-slate-900" />
              </div>
              <span className="font-sans font-bold text-slate-900 text-sm tracking-tight">
                RateFactor <span className="text-[10px] font-mono text-slate-400 font-normal">studio</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Developer-first platform for discovering, benchmarking, peer-critiquing, and showcasing software architecture.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>All systems operational • Edge cached</span>
            </div>
          </div>

          {/* Discovery */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-slate-900 font-semibold tracking-wider">
              Discovery
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li><span className="hover:text-slate-900 transition-colors cursor-pointer">Daily Showcase Spotlight</span></li>
              <li><span className="hover:text-slate-900 transition-colors cursor-pointer">Weekly Champions Archive</span></li>
              <li><span className="hover:text-slate-900 transition-colors cursor-pointer">Systems & Concurrency Engines</span></li>
              <li><span className="hover:text-slate-900 transition-colors cursor-pointer">Creative WebGL Shaders</span></li>
              <li><span className="hover:text-slate-900 transition-colors cursor-pointer">Fullstack Architectures</span></li>
            </ul>
          </div>

          {/* Standards */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-slate-900 font-semibold tracking-wider">
              4-Factor Rubric
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li><span>1. Code Quality & Architecture</span></li>
              <li><span>2. Performance & Verifiability</span></li>
              <li><span>3. Visual Craft & Responsive UX</span></li>
              <li><span>4. Documentation & Reproducibility</span></li>
              <li><span>Zero AI-Generated Card Slop</span></li>
            </ul>
          </div>

          {/* Architecture */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs uppercase text-slate-900 font-semibold tracking-wider">
              Architecture & Stack
            </h4>
            <div className="space-y-1 text-[11px] font-mono text-slate-500">
              <div>Frontend: Next.js 15 App Router</div>
              <div>Styling: Tailwind CSS Editorial</div>
              <div>Animation: Framer Motion</div>
              <div>Database: Supabase PostgreSQL + RLS</div>
              <div>Runtime: Edge Function Realtime</div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
          <div>
            © {new Date().getFullYear()} RateFactor Studio. Engineered for developers who care about code.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Terms of Review</span>
            <span className="hover:text-slate-900 transition-colors cursor-pointer">Telemetry Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
