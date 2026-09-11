"use client";

import React, { useState } from "react";
import { 
  User, 
  MapPin, 
  Building2, 
  Globe, 
  Github, 
  Twitter, 
  FileText, 
  Sparkles, 
  SlidersHorizontal, 
  Plus, 
  Star, 
  Heart, 
  MessageSquare, 
  Award, 
  Trash2, 
  Activity, 
  Pin, 
  Edit3, 
  Smile, 
  ExternalLink,
  CheckCircle2,
  Eye,
  Check,
  Linkedin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DeveloperProfile, UserStatus } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber, formatRating } from "@/lib/utils";
import { EditStatusModal } from "./EditStatusModal";
import { EditBioModal } from "./EditBioModal";
import { CustomizePinsModal } from "./CustomizePinsModal";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ShowcaseShelf } from "./ShowcaseShelf";
import { PublicProfilePreview } from "./PublicProfilePreview";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";

interface DeveloperDashboardProps {
  profile?: DeveloperProfile;
  onUpdateProfile?: (updatedProfile: DeveloperProfile) => void;
  myPortfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
  onDeletePortfolio: (id: string) => void;
  onOpenSubmitModal: () => void;
  onClose?: () => void;
}

export function DeveloperDashboard({
  profile = INITIAL_DEVELOPER_PROFILE,
  onUpdateProfile = () => {},
  myPortfolios,
  onSelectPortfolio,
  onDeletePortfolio,
  onOpenSubmitModal,
  onClose,
}: DeveloperDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "submissions" | "preview">("overview");

  // Modal dialog states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isPinsModalOpen, setIsPinsModalOpen] = useState(false);

  // Success message toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Status update handler
  const handleSaveStatus = (newStatus: UserStatus) => {
    const updated = {
      ...profile,
      status: newStatus,
    };
    onUpdateProfile(updated);
    showToast(`Status updated to "${newStatus.emoji} ${newStatus.message}"`);
  };

  // Profile update handler
  const handleSaveProfile = (updated: DeveloperProfile) => {
    onUpdateProfile(updated);
    showToast("Profile and bio saved successfully.");
  };

  // Pins & Spotlight update handler
  const handleSavePins = (pinnedIds: string[], spotlightId?: string) => {
    const updated = {
      ...profile,
      pinnedPortfolioIds: pinnedIds,
      spotlightPortfolioId: spotlightId || pinnedIds[0],
    };
    onUpdateProfile(updated);
    showToast(`Showcase updated (${pinnedIds.length} portfolios pinned).`);
  };

  // Direct toggle pin on any portfolio
  const handleTogglePinSingle = (portfolioId: string) => {
    const isPinned = profile.pinnedPortfolioIds.includes(portfolioId);
    let nextPinned: string[];
    if (isPinned) {
      nextPinned = profile.pinnedPortfolioIds.filter((id) => id !== portfolioId);
    } else {
      if (profile.pinnedPortfolioIds.length >= 6) {
        showToast("Maximum of 6 portfolios can be pinned to showcase.");
        return;
      }
      nextPinned = [...profile.pinnedPortfolioIds, portfolioId];
    }

    const updated = {
      ...profile,
      pinnedPortfolioIds: nextPinned,
      spotlightPortfolioId:
        profile.spotlightPortfolioId === portfolioId && isPinned
          ? nextPinned[0]
          : profile.spotlightPortfolioId || nextPinned[0],
    };
    onUpdateProfile(updated);
    showToast(isPinned ? "Removed from showcase shelf." : "Pinned to showcase shelf!");
  };

  // Direct set primary spotlight
  const handleSetSpotlightSingle = (portfolioId: string) => {
    let nextPinned = profile.pinnedPortfolioIds;
    if (!nextPinned.includes(portfolioId)) {
      if (nextPinned.length >= 6) {
        showToast("Maximum of 6 portfolios can be pinned to showcase.");
        return;
      }
      nextPinned = [...nextPinned, portfolioId];
    }
    const updated = {
      ...profile,
      pinnedPortfolioIds: nextPinned,
      spotlightPortfolioId: portfolioId,
    };
    onUpdateProfile(updated);
    showToast("Designated as Primary Spotlight showcase!");
  };

  // Metrics computation
  const totalLikes = myPortfolios.reduce((acc, p) => acc + p.likesCount, 0);
  const totalComments = myPortfolios.reduce((acc, p) => acc + p.commentsCount, 0);
  const avgRating =
    myPortfolios.length > 0
      ? myPortfolios.reduce((acc, p) => acc + p.rating, 0) / myPortfolios.length
      : 0;
  const showcaseCount = myPortfolios.filter((p) => p.isShowcase).length;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-medium shadow-2xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Banner / Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-slate-900 text-white">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>Developer Profile &amp; Showcase Console</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </h2>
            <p className="text-xs text-slate-500">
              Manage your GitHub-style developer bio, live status, and curated showcase shelf.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer",
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Showcase &amp; Bio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "submissions"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>All Projects</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {myPortfolios.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer",
              activeTab === "preview"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Public Preview</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0 max-w-full">
          {/* LEFT COLUMN: GitHub-Style Profile Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4 w-full min-w-0">
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
              {/* Avatar with Status Badge */}
              <div className="flex items-start justify-between">
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-sm">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Status Indicator Dot */}
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white",
                      profile.status.isBusy
                        ? "bg-amber-500"
                        : profile.status.statusType === "offline"
                        ? "bg-slate-400"
                        : "bg-emerald-500"
                    )}
                    title={profile.status.isBusy ? "Busy" : "Active"}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Change GitHub Status"
                >
                  <Smile className="w-3.5 h-3.5 text-slate-600" />
                  <span>Set status</span>
                </button>
              </div>

              {/* GitHub Status Bubble */}
              {(profile.status.message || profile.status.emoji) ? (
                <div
                  onClick={() => setIsStatusModalOpen(true)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex items-center gap-2 group"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">
                    {profile.status.emoji || "💭"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {profile.status.message || "Status set"}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>Click to update</span>
                      {profile.status.isBusy && (
                        <span className="text-amber-700 font-mono font-medium">• Busy</span>
                      )}
                    </div>
                  </div>
                  <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors flex-shrink-0" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="w-full py-2 px-3 rounded-2xl border border-dashed border-slate-200 hover:border-slate-300 text-xs text-slate-500 hover:text-slate-800 transition-colors text-left flex items-center gap-2 cursor-pointer"
                >
                  <Smile className="w-3.5 h-3.5 text-slate-400" />
                  <span>Add a GitHub status (e.g. 🚀 Shipping v2)...</span>
                </button>
              )}

              {/* Name, Handle, Pronouns */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{profile.name}</h3>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 min-w-0">
                  <span className="truncate">@{profile.username}</span>
                  {profile.pronouns && <span className="shrink-0">• {profile.pronouns}</span>}
                </div>
                <p className="text-xs text-slate-700 font-medium mt-1 break-words">{profile.role}</p>
              </div>

              {/* GitHub-style Bio */}
              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-2xl border border-slate-100 break-words [overflow-wrap:anywhere]">
                {profile.bio || "No bio added yet. Click 'Edit profile' below to add your bio."}
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={() => setIsBioModalOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit profile &amp; bio</span>
              </button>

              {/* Metadata / Links (GitHub Style) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600 min-w-0">
                {profile.company && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{profile.company}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline truncate"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {profile.github && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Github className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline truncate"
                    >
                      {profile.github.replace(/^https?:\/\/github\.com\//, "@")}
                    </a>
                  </div>
                )}
                {profile.twitter && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Twitter className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    <a
                      href={profile.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline truncate"
                    >
                      {profile.twitter.replace(/^https?:\/\/twitter\.com\//, "@")}
                    </a>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Linkedin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-800 hover:underline truncate"
                    >
                      {profile.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "in/")}
                    </a>
                  </div>
                )}
              </div>

              {/* Skills Tags */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                  Technologies
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Engagement Matrix
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">Rating Score</div>
                  <div className="text-lg font-mono font-bold text-amber-800 mt-0.5">
                    {formatRating(avgRating)}★
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">Peer Likes</div>
                  <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                    {formatNumber(totalLikes)} ♥
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">Comments</div>
                  <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                    {formatNumber(totalComments)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">Showcases</div>
                  <div className="text-lg font-mono font-bold text-amber-800 mt-0.5">
                    {showcaseCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Showcase Shelf, Activity Grid, README (8 cols) */}
          <div className="lg:col-span-8 space-y-6 w-full min-w-0 max-w-full">
            {/* 1. Showcase Shelf (Pinned Portfolios) */}
            <ShowcaseShelf
              myPortfolios={myPortfolios}
              pinnedIds={profile.pinnedPortfolioIds}
              spotlightId={profile.spotlightPortfolioId}
              onCustomizePins={() => setIsPinsModalOpen(true)}
              onSelectPortfolio={onSelectPortfolio}
              onOpenSubmitModal={onOpenSubmitModal}
            />

            {/* 2. GitHub-Style Activity / Contribution Heatmap */}
            <ActivityHeatmap />

            {/* 3. GitHub Profile README.md Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                    {profile.username} / README.md
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Public
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBioModalOpen(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="Edit README.md"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rendered Markdown Body */}
              <div className="pt-1">
                <MarkdownRenderer content={profile.readmeMarkdown} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: All Architectures Registry */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                All Architectures ({myPortfolios.length})
              </h3>
              <p className="text-xs text-slate-500">
                Manage your submitted architectures, toggle pins for your showcase shelf, or submit new blueprints.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit New Architecture</span>
            </button>
          </div>

          {myPortfolios.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-200 rounded-3xl bg-white text-center">
              <h4 className="text-sm font-bold text-slate-900">No projects submitted yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Submit your first architecture to have it reviewed by the developer community.
              </p>
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="mt-4 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold"
              >
                + Submit Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myPortfolios.map((portfolio) => {
                const isPinned = profile.pinnedPortfolioIds.includes(portfolio.id);
                const isSpotlight = profile.spotlightPortfolioId === portfolio.id;

                return (
                  <div
                    key={portfolio.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                        <img
                          src={portfolio.thumbnail}
                          alt={portfolio.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{portfolio.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {portfolio.category}
                          </span>
                          {isSpotlight && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Spotlight
                            </span>
                          )}
                          {isPinned && !isSpotlight && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm sm:max-w-md">
                          {portfolio.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                      <div className="flex items-center gap-3 font-mono text-xs text-slate-500 mr-2">
                        <span className="text-amber-800 font-semibold">★ {formatRating(portfolio.rating)}</span>
                        <span>{portfolio.likesCount} ♥</span>
                        <span>{portfolio.commentsCount} 💬</span>
                      </div>

                      {/* Pin to Showcase Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePinSingle(portfolio.id)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer",
                          isPinned
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        <Pin className="w-3 h-3" />
                        <span>{isPinned ? "Pinned" : "Pin to Shelf"}</span>
                      </button>

                      {/* Spotlight designation button */}
                      {isPinned && (
                        <button
                          type="button"
                          onClick={() => handleSetSpotlightSingle(portfolio.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer",
                            isSpotlight
                              ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          )}
                          title={isSpotlight ? "Primary Spotlight showcase" : "Set as Primary Spotlight"}
                        >
                          <Star className={cn("w-3 h-3", isSpotlight ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
                          <span className="hidden sm:inline">{isSpotlight ? "Spotlight" : "Make Spotlight"}</span>
                        </button>
                      )}

                      {/* Inspect Button */}
                      <button
                        type="button"
                        onClick={() => onSelectPortfolio(portfolio)}
                        className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-800 font-medium transition-colors"
                      >
                        Inspect
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeletePortfolio(portfolio.id)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Public Profile Preview */}
      {activeTab === "preview" && (
        <PublicProfilePreview
          profile={profile}
          myPortfolios={myPortfolios}
          onSelectPortfolio={onSelectPortfolio}
        />
      )}

      {/* Modal Dialogs */}
      <EditStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={profile.status}
        onSaveStatus={handleSaveStatus}
        userAvatar={profile.avatar}
        userName={profile.name}
      />

      <EditBioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />

      <CustomizePinsModal
        isOpen={isPinsModalOpen}
        onClose={() => setIsPinsModalOpen(false)}
        myPortfolios={myPortfolios}
        pinnedIds={profile.pinnedPortfolioIds}
        spotlightId={profile.spotlightPortfolioId}
        onSavePins={handleSavePins}
        onOpenSubmitModal={onOpenSubmitModal}
      />
    </div>
  );
}
