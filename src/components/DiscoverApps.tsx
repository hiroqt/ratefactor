"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Compass,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Layers,
  ListFilter,
  ArrowUpDown,
  X,
  ArrowRight,
  RotateCcw,
  Plus
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { Portfolio, PortfolioCategory, SortOption } from "@/types/portfolio";
import { PORTFOLIO_DOMAINS, PortfolioDomain, isPortfolioDomain } from "@/lib/portfolio-domains";
import { AppCard } from "./AppCard";
import { PortfolioCard } from "./PortfolioCard";
import { EmptyState } from "./feedback/EmptyState";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export interface DiscoverAppsProps {
  portfolios: Portfolio[];
  onSelectPortfolio: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  onReact?: (id: string, emojiName: string) => void;
  currentUser?: any;
  onOpenSubmitModal?: () => void;
  initialCategory?: PortfolioCategory;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  className?: string;
  id?: string;
}

// Portfolio Domains filter — describes a portfolio's visual/interaction/
// technical experience (Three.js, GSAP, ...), independent of `category`.
// Sourced from the shared allowlist so this never drifts from validation.
export const DOMAIN_FILTERS: { label: string; value: PortfolioDomain | "All" }[] = [
  { label: "All Domains", value: "All" },
  ...PORTFOLIO_DOMAINS.map((d) => ({ label: d, value: d })),
];

export function DiscoverApps({
  portfolios,
  onSelectPortfolio,
  onLikeToggle,
  onReact,
  currentUser,
  onOpenSubmitModal,
  initialCategory = "All",
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  className,
  id = "discover-apps-section",
}: DiscoverAppsProps) {
  // Category filtering is driven externally (Navbar's category selector) via
  // `initialCategory`; kept in sync here so it still composes with the
  // in-component domain filter below instead of being silently dropped.
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>(initialCategory);
  useEffect(() => {
    setActiveCategory(initialCategory);
    setCurrentPage(1);
  }, [initialCategory]);

  const [activeDomain, setActiveDomain] = useState<PortfolioDomain | "All">("All");
  // Server-filtered results for the active domain (null while "All" / not yet loaded,
  // in which case `portfolios` — already fetched by the caller — is used directly).
  const [domainResults, setDomainResults] = useState<Portfolio[] | null>(null);
  const [isDomainLoading, setIsDomainLoading] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("highest_rated");
  const [viewMode, setViewMode] = useState<"grid3" | "grouped" | "list">("grid3");
  
  // Use external search query if controlled, otherwise internal
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (q: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(q);
    } else {
      setInternalSearchQuery(q);
    }
  };

  // Pagination State (itemsPerPage defaults to 9 = 3x3 showcase grid)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);

  const sectionRef = useRef<HTMLDivElement>(null);

  // Fetch server-side whenever the active domain filter changes. Selecting a
  // specific domain must return portfolios whose `domains` array contains it
  // (filtered by Postgres via ?domain=, not by scanning the already-loaded
  // `portfolios` prop client-side). "All Domains" clears this and falls back
  // to `portfolios` as already fetched by the caller.
  useEffect(() => {
    if (activeDomain === "All") {
      setDomainResults(null);
      return;
    }
    let cancelled = false;
    setIsDomainLoading(true);
    fetch(`/api/portfolios?domain=${encodeURIComponent(activeDomain)}&limit=50`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.portfolios && Array.isArray(data.portfolios)) {
          setDomainResults(data.portfolios);
        } else {
          setDomainResults([]);
        }
      })
      .catch(() => {
        if (!cancelled) setDomainResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsDomainLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDomain]);

  // Compute active domain index for GooeyNav
  const activeDomainIndex = useMemo(() => {
    const idx = DOMAIN_FILTERS.findIndex((c) => c.value === activeDomain);
    return idx === -1 ? 0 : idx;
  }, [activeDomain]);

  // Reset pagination to page 1 whenever filters change
  const handleDomainChange = (domain: PortfolioDomain | "All") => {
    setActiveDomain(domain);
    setCurrentPage(1);
    trackEvent("discover_apps_domain_filter", { domain });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
    setCurrentPage(1);
    trackEvent("discover_apps_sort_change", { sort });
  };

  // Base list this view operates on: the caller's already-fetched portfolios
  // for "All Domains", or the server-filtered result set for a specific
  // domain (see the fetch effect above).
  const baseApps = activeDomain === "All" ? portfolios : domainResults || [];

  // Count badge for "All Domains" only — per-domain counts would require a
  // separate query per domain, so only the cheap, already-available total is shown.
  const domainCounts = useMemo(() => ({ All: portfolios.length }), [portfolios]);

  // Filter & Sort portfolios (domain filtering already happened server-side;
  // this only applies search/sort on top of the resulting base list)
  const filteredApps = useMemo(() => {
    let result = [...baseApps];

    // 0. Category Filter (independent of, and composes with, domain filtering above)
    if (activeCategory !== "All") {
      result = result.filter((p) => p.category === activeCategory);
    }

    // 1. Search Query Filter (Title, Tagline, Tech, Author, Category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.author.username?.toLowerCase().includes(q) ||
          p.techStack.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    // 3. Sort Ordering
    if (sortOption === "highest_rated") {
      result.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    } else if (sortOption === "most_liked") {
      result.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sortOption === "most_discussed") {
      result.sort((a, b) => b.commentsCount - a.commentsCount);
    } else if (sortOption === "latest") {
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortOption === "showcase") {
      result.sort((a, b) => (b.isShowcase ? 1 : 0) - (a.isShowcase ? 1 : 0));
    }

    return result;
  }, [baseApps, activeCategory, searchQuery, sortOption]);

  // Grouped-by-domain mapping (for grouped view). A portfolio can belong to
  // several domains at once; here it's grouped under its first domain (or
  // "Uncategorized" if it has none yet) purely for this display grouping —
  // the actual domain filter above already returns it under every domain
  // it lists.
  const groupedApps = useMemo(() => {
    const map = new Map<string, Portfolio[]>();
    filteredApps.forEach((app) => {
      const cat = app.domains?.[0] || "Uncategorized";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(app);
    });
    return map;
  }, [filteredApps]);

  // Pagination calculation
  const totalApps = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalApps / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalApps);
  const paginatedApps = useMemo(() => {
    return filteredApps.slice(startIndex, endIndex);
  }, [filteredApps, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      trackEvent("discover_apps_page_change", { page: newPage });
      // Smooth scroll back to discover section header
      if (sectionRef.current) {
        const topPos = sectionRef.current.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: topPos, behavior: "smooth" });
      }
    }
  };

  // Generate pagination buttons array with ellipses
  const paginationPages = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Prepare items for GooeyNav
  const gooeyNavItems = useMemo(() => {
    return DOMAIN_FILTERS.map((d) => ({
      label: d.label,
    }));
  }, []);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn("py-10 relative z-10", className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================================= */}
        {/* 1. SECTION HEADER WITH SUBMIT PORTFOLIO PILL (MATCHING NAVBAR)             */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400">
                <Compass className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Portfolio Directory
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Discover Developer Portfolios
            </h2>
            <p className="text-base sm:text-[19px] text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed font-normal">
              Browse developer portfolios, open-source architectures, and creative codebases categorized across domains with peer ratings and 5-per-line layouts.
            </p>
          </div>

          {/* Submit Portfolio Button (Identical to Navbar style) */}
          {onOpenSubmitModal && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onOpenSubmitModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow transition-all whitespace-nowrap shrink-0 cursor-pointer self-start md:self-auto"
            >
              <span>Submit Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </motion.button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. GOOEY CATEGORY NAVIGATION BAR                                           */}
        {/* ========================================================================= */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Portfolio Domains</span>
            </span>
            <span suppressHydrationWarning className="text-xs font-mono text-slate-400 dark:text-slate-500">
              {isDomainLoading ? "Loading…" : `${totalApps} ${totalApps === 1 ? "portfolio" : "portfolios"} found`}
            </span>
          </div>

          {/* Gooey Navigation Bar */}
          <div className="overflow-x-auto pb-2 scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 overscroll-x-contain touch-pan-x">
            <GooeyNav
              items={gooeyNavItems}
              value={activeDomainIndex}
              onChange={(index) => {
                const target = DOMAIN_FILTERS[index];
                if (target) {
                  handleDomainChange(target.value);
                }
              }}
              size="sm"
              activeColor="#0f172a"
              activeLabelColor="#ffffff"
              className="p-1 rounded-xl bg-slate-100/90 border border-slate-200 shadow-2xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FILTER BAR: Search, Sort, and View Modes                                */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              id="discover-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search portfolios by title, author, tech stack..."
              className="w-full bg-white dark:bg-zinc-800 text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-slate-900 dark:text-white transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Sort & View Mode Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Sort select */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <select
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-medium focus:outline-hidden cursor-pointer"
                aria-label="Sort portfolios"
              >
                <option value="highest_rated" className="dark:bg-zinc-800 dark:text-white">Highest Rated</option>
                <option value="most_liked" className="dark:bg-zinc-800 dark:text-white">Most Liked</option>
                <option value="most_discussed" className="dark:bg-zinc-800 dark:text-white">Most Discussed</option>
                <option value="latest" className="dark:bg-zinc-800 dark:text-white">Newest First</option>
                <option value="showcase" className="dark:bg-zinc-800 dark:text-white">Showcase First</option>
              </select>
            </div>

            {/* View Mode Buttons */}
            <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid3")}
                title="3x3 Showcase Grid View"
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                  viewMode === "grid3"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                title="Grouped by Domain View"
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                  viewMode === "grouped"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MAIN PORTFOLIOS GRID: 3x3 SHOWCASE GRID                                 */}
        {/* ========================================================================= */}

        {totalApps === 0 ? (
          <EmptyState
            title={
              portfolios.length === 0
                ? "No developer portfolios submitted yet"
                : "No portfolios match your criteria"
            }
            description={
              portfolios.length === 0
                ? "Be the first developer to showcase your codebase! Submit your portfolio to receive community ratings and peer critiques."
                : "Try choosing a different category or domain, clearing your search query, or submit the first portfolio in this domain!"
            }
            action={
              portfolios.length === 0
                ? onOpenSubmitModal
                  ? {
                      label: "Submit Portfolio",
                      onClick: onOpenSubmitModal,
                      icon: <Plus className="w-3.5 h-3.5" />,
                    }
                  : undefined
                : {
                    label: "Reset Filters",
                    onClick: () => {
                      setActiveCategory("All");
                      setActiveDomain("All");
                      setSearchQuery("");
                      setCurrentPage(1);
                    },
                    icon: <RotateCcw className="w-3.5 h-3.5" />,
                  }
            }
            secondaryAction={
              portfolios.length > 0 && onOpenSubmitModal ? (
                <button
                  type="button"
                  onClick={onOpenSubmitModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Architecture</span>
                </button>
              ) : undefined
            }
            filterBadges={
              portfolios.length > 0 &&
              (activeCategory !== "All" || activeDomain !== "All" || searchQuery.trim().length > 0)
                ? [
                    ...(activeCategory !== "All"
                      ? [
                          {
                            label: `Category: ${activeCategory}`,
                            onRemove: () => {
                              setActiveCategory("All");
                              setCurrentPage(1);
                            },
                          },
                        ]
                      : []),
                    ...(activeDomain !== "All"
                      ? [
                          {
                            label: `Domain: ${activeDomain}`,
                            onRemove: () => handleDomainChange("All"),
                          },
                        ]
                      : []),
                    ...(searchQuery.trim().length > 0
                      ? [
                          {
                            label: `Query: "${searchQuery}"`,
                            onRemove: () => {
                              setSearchQuery("");
                              setCurrentPage(1);
                            },
                          },
                        ]
                      : []),
                  ]
                : undefined
            }
            className="my-8"
          />
        ) : viewMode === "grid3" ? (
          /* ======================================================================= */
          /* 3 BY 3 GRID: Responsive grid-cols-1 md:grid-cols-2 lg:grid-cols-3      */
          /* ======================================================================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedApps.map((app, index) => (
                <AppCard
                  key={app.id}
                  portfolio={app}
                  index={startIndex + index}
                  onSelect={onSelectPortfolio}
                  onLikeToggle={onLikeToggle}
                  onReact={onReact}
                  currentUser={currentUser}
                />
              ))}
            </div>
          </div>
        ) : viewMode === "grouped" ? (
          /* ======================================================================= */
          /* GROUPED BY DOMAIN VIEW                                                  */
          /* ======================================================================= */
          <div className="space-y-10">
            {Array.from(groupedApps.entries()).map(([domainCat, apps]) => (
              <div key={domainCat} className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {domainCat}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      {apps.length} {apps.length === 1 ? "portfolio" : "portfolios"}
                    </span>
                  </div>

                  {isPortfolioDomain(domainCat) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDomainChange(domainCat);
                        setViewMode("grid3");
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all in {domainCat}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 3 columns showcase in domain group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apps.slice(0, 6).map((app, idx) => (
                    <AppCard
                      key={app.id}
                      portfolio={app}
                      index={idx}
                      onSelect={onSelectPortfolio}
                      onLikeToggle={onLikeToggle}
                      onReact={onReact}
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ======================================================================= */
          /* LIST VIEW                                                               */
          /* ======================================================================= */
          <div className="space-y-3">
            {paginatedApps.map((app, index) => (
              <PortfolioCard
                key={app.id}
                portfolio={app}
                viewMode="list"
                index={startIndex + index}
                onSelect={onSelectPortfolio}
                onLikeToggle={onLikeToggle}
                onReact={onReact}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. PAGINATION CONTROLS                                                    */}
        {/* ========================================================================= */}
        {totalApps > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status info & items per page selector */}
            <div suppressHydrationWarning className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span suppressHydrationWarning>
                Showing <strong className="text-slate-900 dark:text-white">{startIndex + 1}</strong>–
                <strong className="text-slate-900 dark:text-white">{endIndex}</strong> of{" "}
                <strong className="text-slate-900 dark:text-white">{totalApps}</strong> portfolios
              </span>

              <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700" />

              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setItemsPerPage(next);
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-md px-1.5 py-0.5 text-xs font-mono focus:outline-hidden cursor-pointer"
                  aria-label="Portfolios per page"
                >
                  <option value={9} className="dark:bg-zinc-800 dark:text-white">9 (3x3 grid)</option>
                  <option value={18} className="dark:bg-zinc-800 dark:text-white">18 (6x3 grid)</option>
                  <option value={27} className="dark:bg-zinc-800 dark:text-white">27 (9x3 grid)</option>
                  <option value={36} className="dark:bg-zinc-800 dark:text-white">36 (12x3 grid)</option>
                </select>
              </div>
            </div>

            {/* Pagination Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  safeCurrentPage <= 1
                    ? "bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 text-slate-300 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-xs"
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {paginationPages.map((page, pIdx) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`ellipsis-${pIdx}`}
                        className="px-2 py-1 text-xs text-slate-400 dark:text-zinc-500 font-mono"
                      >
                        ...
                      </span>
                    );
                  }

                  const pNum = Number(page);
                  const isCurrent = pNum === safeCurrentPage;

                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => handlePageChange(pNum)}
                      className={cn(
                        "w-8 h-8 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center",
                        isCurrent
                          ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white shadow-2xs"
                      )}
                      aria-label={`Page ${pNum}`}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  safeCurrentPage >= totalPages
                    ? "bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 text-slate-300 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-xs"
                )}
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
