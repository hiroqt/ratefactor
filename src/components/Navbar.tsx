"use client";

import React, { useState } from "react";
import { 
  Terminal, 
  Bell, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Award, 
  User, 
  Sparkles,
  Command,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenSubmitModal: () => void;
  onOpenDashboard: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Navbar({
  unreadCount,
  onOpenNotifications,
  onOpenSubmitModal,
  onOpenDashboard,
  activeNavTab,
  setActiveNavTab,
  searchQuery,
  setSearchQuery,
}: NavbarProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveNavTab("discover")}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-md bg-surface-raised border border-border group-hover:border-brand-500/50 flex items-center justify-center transition-colors shadow-sm">
              <Terminal className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-base tracking-tight text-foreground group-hover:text-brand-400 transition-colors">
                  Rate<span className="text-brand-400">Factor</span>
                </span>
                <span className="text-[10px] font-mono uppercase bg-surface-raised border border-border text-muted-dark px-1.5 py-0.2 rounded">
                  beta
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Main Navigation">
            <button
              onClick={() => setActiveNavTab("discover")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeNavTab === "discover"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground hover:bg-surface/50"
              )}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveNavTab("showcase")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                activeNavTab === "showcase"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground hover:bg-surface/50"
              )}
            >
              <Award className="w-3.5 h-3.5 text-brand-400" />
              Showcases
            </button>
            <button
              onClick={onOpenDashboard}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                activeNavTab === "dashboard"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground hover:bg-surface/50"
              )}
            >
              Dashboard
            </button>
          </nav>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search portfolios, tech (e.g. Rust, Next.js), authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-raised border border-border focus:border-brand-500/50 rounded-md pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none transition-colors"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border/60">
              <Command className="w-2.5 h-2.5" />K
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Realtime Notification Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-md bg-surface-raised border border-border hover:border-border-hover text-muted hover:text-foreground transition-colors focus:outline-none"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-[10px] font-mono font-bold text-background">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Submit Portfolio CTA */}
          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-400 text-background font-medium text-xs shadow-sm transition-all hover:shadow-glow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Submit Portfolio</span>
            <span className="sm:hidden">Submit</span>
          </button>

          {/* Developer Profile trigger */}
          <button
            type="button"
            onClick={onOpenDashboard}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-md bg-surface-raised border border-border hover:border-border-hover transition-colors"
            aria-label="Developer Dashboard"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-brand-500/20 border border-brand-500/30">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80"
                alt="Arnel Rivera"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-mono font-medium text-foreground hidden lg:inline">
              @arneldev
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
