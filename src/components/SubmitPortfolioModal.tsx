"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  Terminal, 
  Upload, 
  Check, 
  CheckCircle2,
  CheckCheck,
  AlertCircle, 
  Link as LinkIcon, 
  Github, 
  Globe, 
  Eye, 
  Plus,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Copy,
  Twitter,
  Flame
} from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { PORTFOLIO_DOMAINS, PortfolioDomain, MAX_PORTFOLIO_DOMAINS } from "@/lib/portfolio-domains";
import { DeveloperProfile } from "@/types/profile";
import { PortfolioCard } from "./PortfolioCard";
import { Avatar } from "@/components/ui/Avatar";
import { GithubVerificationLabel } from "@/components/GithubVerifiedBadge";
import { authClient } from "@/lib/auth/client";
import { cn, isValidHttpUrl, normalizeUrl } from "@/lib/utils";
import { 
  validatePortfolioDescription, 
  validateImageUpload, 
  MIN_DESCRIPTION_CHARACTERS,
} from "@/lib/guardrails";
import { compressPortfolioCoverImage } from "@/lib/image-compression";
import { cleanupPortfolioCover, uploadPortfolioCover, UploadedPortfolioCover } from "@/lib/portfolio-cover-upload";

export interface SubmitPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPortfolio: Portfolio) => void | Promise<any>;
  existingPortfolios: Portfolio[];
  profile?: DeveloperProfile;
  currentUser?: any;
  onViewPortfolio?: (portfolio: Portfolio) => void;
  onRequireAuth?: (intent: string) => void;
}

const PRESET_THUMBNAILS = [
  {
    label: "Rust / Systems",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Creative Shader",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Terminal / CLI",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Data & AST",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  },
];

const SUGGESTED_TECHS = [
  "TypeScript",
  "Rust",
  "Next.js 15",
  "Tailwind CSS",
  "Go",
  "React 19",
  "WASM",
  "WebGL2",
  "eBPF",
  "PostgreSQL",
];

export function SubmitPortfolioModal({
  isOpen,
  onClose,
  onSubmit,
  existingPortfolios,
  profile,
  currentUser,
  onViewPortfolio,
  onRequireAuth,
}: SubmitPortfolioModalProps) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState(PRESET_THUMBNAILS[0].url);
  const [category, setCategory] = useState<"Developer" | "Arts" | "Client" | "Frontend" | "Fullstack" | "Systems" | "Design Engineer" | "Mobile" | "AI / ML">("Developer");
  const [techStack, setTechStack] = useState<string[]>(["TypeScript", "Next.js 15"]);
  const [domains, setDomains] = useState<PortfolioDomain[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [requestCritique, setRequestCritique] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  // Project-level GitHub verification PREVIEW only — server-derived, never
  // trusted at publish time (the publish route re-verifies independently).
  // This purely informs what the modal shows the user before they submit.
  const [githubPreview, setGithubPreview] = useState<{
    status: "owner" | "contributor" | "none" | null;
    reason?: string;
    repositoryFullName?: string;
  } | null>(null);
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);

  // Submission & Success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedPortfolio, setSubmittedPortfolio] = useState<Portfolio | null>(null);

  // Single image upload & quota tracking (Free tier standard: Max 2 MB, 1 image)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Description character count (optional field, min 200 chars if provided)
  const descriptionChars = description.trim().length;

  const triggerCelebration = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      // 1. Center fountain burst
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { x: 0.5, y: 0.5 },
        zIndex: 100000,
        colors: ["#10B981", "#3B82F6", "#6366F1", "#F59E0B", "#06B6D4", "#EC4899"],
      });

      // 2. Left cannon burst
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.65 },
          zIndex: 100000,
          colors: ["#10B981", "#3B82F6", "#06B6D4"],
        });
      }, 160);

      // 3. Right cannon burst
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.65 },
          zIndex: 100000,
          colors: ["#10B981", "#F59E0B", "#EC4899"],
        });
      }, 320);
    } catch {
      // Graceful fallback if canvas is not available
    }
  }, []);

  const handleCopyShareLink = useCallback(() => {
    if (!submittedPortfolio) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/u/${submittedPortfolio.author.username}`
      : `https://ratefactor.dev/u/${submittedPortfolio.author.username}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, [submittedPortfolio]);

  useEffect(() => {
    if (isSuccess && submittedPortfolio) {
      triggerCelebration();
    }
  }, [isSuccess, submittedPortfolio, triggerCelebration]);

  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setIsSuccess(false);
        setSubmittedPortfolio(null);
        setError(null);
        setIsSubmitting(false);
        setCopiedLink(false);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useModalSmoothScroll({
    isOpen,
    modalRef,
    scrollRef,
    deps: [activeTab, uploadedFile, thumbnail, error],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageUpload(file);
    if (!validation.isValid) {
      setFileUploadError(validation.error || "File exceeds maximum size of 2 MB.");
      return;
    }

    setFileUploadError(null);
    setIsCompressingImage(true);

    try {
      // Compress to high-efficiency WebP/JPEG thumbnail downscaled to max 1200x675
      const compressed = await compressPortfolioCoverImage(file);
      setUploadedFile({ name: file.name, size: compressed.compressedSizeBytes, url: compressed.dataUrl });
      setThumbnail(compressed.dataUrl);
    } catch (err: any) {
      setFileUploadError(err?.message || "Could not optimize the cover image.");
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleGithubUrlBlur = useCallback(async () => {
    const url = githubUrl.trim();
    if (!currentUser || !url || !isValidHttpUrl(url)) return;
    setIsCheckingGithub(true);
    try {
      const res = await fetch("/api/github/verify-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: url }),
      });
      const json = await res.json().catch(() => null);
      if (json) {
        setGithubPreview({ status: json.status, reason: json.reason, repositoryFullName: json.repositoryFullName });
      }
    } catch {
      // Non-blocking preview — a failed check just means no badge shows yet.
      setGithubPreview({ status: null, reason: "unavailable" });
    } finally {
      setIsCheckingGithub(false);
    }
  }, [githubUrl, currentUser]);

  const handleConnectGithub = useCallback(() => {
    authClient.linkSocial({
      provider: "github",
      callbackURL: typeof window !== "undefined" ? window.location.href : "/",
    });
  }, []);

  const resetForm = () => {
    setTitle("");
    setTagline("");
    setDescription("");
    setPortfolioUrl("");
    setGithubUrl("");
    setGithubPreview(null);
    setDemoUrl("");
    setThumbnail(PRESET_THUMBNAILS[0].url);
    setUploadedFile(null);
    setFileUploadError(null);
    setCategory("Developer");
    setTechStack(["TypeScript", "Next.js 15"]);
    setDomains([]);
    setCustomTech("");
    setRequestCritique(false);
    setError(null);
    setActiveTab("form");
  };

  const handleAddTech = (tech: string) => {
    const trimmed = tech.trim();
    if (!trimmed || techStack.includes(trimmed)) return;
    setTechStack([...techStack, trimmed]);
    setCustomTech("");
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleToggleDomain = (domain: PortfolioDomain) => {
    setDomains((prev) => {
      if (prev.includes(domain)) return prev.filter((d) => d !== domain);
      if (prev.length >= MAX_PORTFOLIO_DOMAINS) return prev;
      return [...prev, domain];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError("You must be signed in with an active account to submit a developer portfolio.");
      onRequireAuth?.("Sign in with Google or GitHub to submit a developer portfolio.");
      return;
    }

    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!tagline.trim()) {
      setError("Project tagline / short description is required.");
      return;
    }
    if (!portfolioUrl.trim() || !isValidHttpUrl(portfolioUrl)) {
      setError("Please provide a valid Portfolio / Live URL starting with http:// or https://");
      return;
    }
    if (!githubUrl.trim() || !isValidHttpUrl(githubUrl)) {
      setError("Please provide a valid GitHub repository URL starting with http:// or https://");
      return;
    }
    if (demoUrl.trim() && !isValidHttpUrl(demoUrl)) {
      setError("Please provide a valid Demo URL starting with http:// or https://");
      return;
    }
    if (techStack.length === 0) {
      setError("Please add at least one technology stack tag.");
      return;
    }
    if (domains.length === 0) {
      setError("Please select at least one portfolio domain.");
      return;
    }

    const normPortUrl = normalizeUrl(portfolioUrl);
    const normGitUrl = normalizeUrl(githubUrl);
    const normTitle = title.trim().toLowerCase();

    const isDuplicate = existingPortfolios.some(
      (p) =>
        normalizeUrl(p.portfolioUrl) === normPortUrl ||
        normalizeUrl(p.githubUrl) === normGitUrl ||
        p.title.trim().toLowerCase() === normTitle
    );

    if (isDuplicate) {
      setError("Duplicate submission detected: A portfolio with this title or repository URL has already been published.");
      return;
    }

    // Optional description: if provided, must be at least 200 characters
    const descValidation = validatePortfolioDescription(description);
    if (!descValidation.isValid) {
      setError(descValidation.error || `If provided, description must be at least ${MIN_DESCRIPTION_CHARACTERS} characters.`);
      return;
    }

    if (!thumbnail) {
      setError("Cover image is required. Please upload an image (max 2 MB) or select a preset.");
      return;
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const id = slug ? `${slug}-${Date.now().toString(36)}` : `portfolio-${Date.now().toString(36)}`;

    const newPortfolio: Portfolio = {
      id,
      title: title.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      portfolioUrl: portfolioUrl.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl.trim() || portfolioUrl.trim(),
      thumbnail,
      imageSizeBytes: uploadedFile?.size || 1024 * 500,
      author: {
        name: currentUser?.name || profile?.name || "Developer",
        username: currentUser?.username || profile?.username || "developer",
        avatar: currentUser?.avatar || profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        role: currentUser?.role || profile?.role || "Software Engineer",
        isVerified: true,
        availableForHire: profile?.availableForHire ?? true,
      },
      techStack,
      category,
      domains,
      rating: 0,
      ratingCount: 0,
      ratingBreakdown: {
        design: 0,
        codeQuality: 0,
        performance: 0,
        documentation: 0,
      },
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
      requestCritique: Boolean(requestCritique),
    };

    setIsSubmitting(true);
    let uploadedAsset: UploadedPortfolioCover | null = null;
    try {
      if (uploadedFile) {
        uploadedAsset = await uploadPortfolioCover(uploadedFile.url);
        newPortfolio.thumbnail = uploadedAsset.secureUrl;
        newPortfolio.thumbnailPublicId = uploadedAsset.publicId;
        newPortfolio.thumbnailUploadReceipt = uploadedAsset.receipt;
        newPortfolio.thumbnailUploadVersion = uploadedAsset.version;
        newPortfolio.thumbnailUploadSignature = uploadedAsset.signature;
      }
      const result = await onSubmit(newPortfolio);
      const confirmedPortfolio = (result && typeof result === "object" && "title" in result)
        ? (result as Portfolio)
        : newPortfolio;
      setSubmittedPortfolio(confirmedPortfolio);
      setIsSuccess(true);
      resetForm();
    } catch (err: any) {
      if (uploadedAsset && Number(err?.status) >= 400 && Number(err?.status) < 500) {
        await cleanupPortfolioCover(uploadedAsset).catch(() => undefined);
      }
      setError(err?.message || "Failed to submit portfolio. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPortfolio: Portfolio = {
    id: "preview-id",
    title: title || "Your Architecture Title",
    tagline: tagline || "A concise, technically accurate description of what you engineered.",
    description: description || "Detailed architectural description...",
    portfolioUrl: portfolioUrl || "https://example.com",
    githubUrl: githubUrl || "https://github.com/user/repo",
    thumbnail,
    author: {
      name: currentUser?.name || profile?.name || "Developer",
      username: currentUser?.username || profile?.username || "developer",
      avatar: currentUser?.avatar || profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      role: currentUser?.role || profile?.role || "Principal Architect",
      isVerified: true,
    },
    techStack: techStack.length > 0 ? techStack : ["TypeScript", "Next.js"],
    category,
    domains,
    rating: 0,
    ratingCount: 0,
    ratingBreakdown: {
      design: 0,
      codeQuality: 0,
      performance: 0,
      documentation: 0,
    },
    likesCount: 0,
    isLiked: false,
    commentsCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    requestCritique: Boolean(requestCritique),
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md modal-backdrop"
        onClick={onClose}
      />

      <motion.div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/20 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-lg border shrink-0 transition-colors",
              isSuccess 
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60" 
                : "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border-slate-200 dark:border-zinc-700"
            )}>
              <Terminal className="w-4 h-4" />
            </div>
            <h3 id="submit-modal-title" className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {isSuccess ? (
                <span>Portfolio Successfully Published</span>
              ) : (
                <>
                  <span className="hidden sm:inline">Submit Portfolio for Peer Review</span>
                  <span className="sm:hidden">Submit Portfolio</span>
                </>
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isSuccess && (
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-zinc-800 p-0.5 border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                    activeTab === "form" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-semibold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  )}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                    activeTab === "preview" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-semibold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (isSuccess) {
                  setIsSuccess(false);
                  setSubmittedPortfolio(null);
                }
                onClose();
              }}
              className="p-1.5 rounded-full text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ml-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain">
          {isSuccess && submittedPortfolio ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="py-2 sm:py-4 flex flex-col items-center text-center w-full max-w-xl mx-auto"
            >
              {/* Status Badge */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.25 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-medium mb-3 border border-emerald-200 dark:border-emerald-800/60 shadow-xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>PUBLISHED &bull; LIVE ON RATEFACTOR</span>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2"
              >
                Portfolio Live on RateFactor!
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md leading-relaxed mb-6"
              >
                Your portfolio <span className="font-semibold text-slate-900 dark:text-white">“{submittedPortfolio.title}”</span> is now published and live in the community showcase! It is open for ratings, peer reviews, and technical feedback.
              </motion.p>

              {/* Unboxed Editorial Portfolio Showcase (NO Cards) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="w-full text-left space-y-3 mb-5"
              >
                {/* Cinematic Media Banner */}
                <div className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm group">
                  <img
                    src={submittedPortfolio.thumbnail}
                    alt={submittedPortfolio.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                  {/* Overlaid Category & Critique Badge */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-mono font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-md border border-white/15">
                      {submittedPortfolio.category}
                    </span>
                    {submittedPortfolio.requestCritique && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm font-mono">
                        <Flame className="w-3 h-3" />
                        <span>Critique Requested</span>
                      </span>
                    )}
                  </div>

                  {/* Overlaid External Quick Links */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                    {submittedPortfolio.portfolioUrl && (
                      <a
                        href={submittedPortfolio.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors text-xs font-medium flex items-center gap-1"
                        title="Visit Live Site"
                      >
                        <Globe className="w-3 h-3 text-sky-300" />
                        <span>Live Demo</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                    {submittedPortfolio.githubUrl && (
                      <a
                        href={submittedPortfolio.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-colors text-xs font-medium flex items-center gap-1"
                        title="View GitHub Repository"
                      >
                        <Github className="w-3 h-3 text-white" />
                        <span>Repo</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Editorial Typography & Attribution */}
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {submittedPortfolio.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {submittedPortfolio.tagline}
                  </p>
                </div>

                {/* Author Metadata & Tech Stack (Inline, no card) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={submittedPortfolio.author.avatar}
                      alt={submittedPortfolio.author.name}
                      fallback={submittedPortfolio.author.name}
                      size="xs"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                      {submittedPortfolio.author.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                      @{submittedPortfolio.author.username}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 items-center">
                    {submittedPortfolio.techStack.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-zinc-700 font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                    {submittedPortfolio.techStack.length > 4 && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                        +{submittedPortfolio.techStack.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Borderless Live Milestones Tracker */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="w-full flex items-center justify-between text-left py-3 border-y border-slate-100 dark:border-white/10 mb-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">Published</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">#{submittedPortfolio.id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="h-px flex-1 mx-3 bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">Peer Review</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">Queue active</p>
                  </div>
                </div>

                <div className="h-px flex-1 mx-3 bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-none">Live</p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">Community showcase</p>
                  </div>
                </div>
              </motion.div>

              {/* Engagement Toolbar: Copy Link, Share on X */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="w-full flex items-center justify-center gap-2.5 pb-4 flex-wrap"
              >
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-medium"
                >
                  {copiedLink ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `I just published "${submittedPortfolio.title}" on @RateFactor for peer review! Check it out:`
                  )}&url=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? `${window.location.origin}/u/${submittedPortfolio.author.username}`
                      : `https://ratefactor.dev/u/${submittedPortfolio.author.username}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-medium"
                >
                  <Twitter className="w-3.5 h-3.5 text-sky-500" />
                  <span>Share to X</span>
                </a>
              </motion.div>

              {/* Main Action CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="w-full flex flex-col-reverse sm:flex-row gap-2.5 items-center justify-center pt-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setSubmittedPortfolio(null);
                    onClose();
                  }}
                  className={cn(
                    "w-full py-2.5 px-5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer",
                    onViewPortfolio ? "sm:w-1/3" : "sm:w-auto"
                  )}
                >
                  Done
                </button>
                {onViewPortfolio && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = submittedPortfolio;
                      setIsSuccess(false);
                      setSubmittedPortfolio(null);
                      onClose();
                      onViewPortfolio(p);
                    }}
                    className="w-full sm:w-2/3 py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs hover:bg-black dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>View Live Listing</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            </motion.div>
          ) : activeTab === "preview" ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                Live showcase rendering preview:
              </div>
              <div className="max-w-md mx-auto">
                <PortfolioCard
                  portfolio={previewPortfolio}
                  onSelect={() => {}}
                  viewMode="grid"
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyperion LSM Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1">
                  Tagline / Technical Summary *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Embedded Log-Structured Merge tree in Rust with SIMD-accelerated SSTables"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors shadow-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Live Demo URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors shadow-xs"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-slate-900 dark:text-white flex items-center gap-1">
                      <Github className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> GitHub Repository *
                    </label>
                    {/* Project-level GitHub verification preview — informational only, never trusted at publish */}
                    {isCheckingGithub && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md shrink-0">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Verifying…
                      </span>
                    )}
                    {!isCheckingGithub && githubPreview?.status && githubPreview.status !== "none" && (
                      <GithubVerificationLabel verification={{ status: githubPreview.status }} variant="pill" />
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="https://github.com/user/repo"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      setGithubPreview(null);
                    }}
                    onBlur={handleGithubUrlBlur}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors shadow-xs"
                    required
                  />

                  {!isCheckingGithub && githubPreview?.status === null && githubPreview.reason === "not_linked" && (
                    <button
                      type="button"
                      onClick={handleConnectGithub}
                      className="mt-1.5 text-[11px] text-sky-700 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                    >
                      Connect GitHub to verify your relationship to this repository
                    </button>
                  )}
                  {!isCheckingGithub && githubPreview?.status === null && githubPreview.reason === "unavailable" && (
                    <p className="mt-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                      Couldn't verify GitHub relationship right now — you can still publish.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1">
                  Primary Domain *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 transition-colors shadow-xs"
                >
                  <optgroup label="Portfolio Type" className="dark:bg-zinc-900 dark:text-white">
                    <option value="Developer">Developer Portfolio</option>
                    <option value="Arts">Arts Portfolio</option>
                    <option value="Client">Client Portfolio</option>
                  </optgroup>
                  <optgroup label="Technical Domain" className="dark:bg-zinc-900 dark:text-white">
                    <option value="Frontend">Frontend Architecture</option>
                    <option value="Systems">Systems &amp; Low-Level</option>
                    <option value="Fullstack">Fullstack / Cloud</option>
                    <option value="Design Engineer">Design Engineering</option>
                    <option value="AI / ML">AI / Machine Learning</option>
                    <option value="Mobile">Mobile Native</option>
                  </optgroup>
                </select>
              </div>

              {/* Portfolio Domains — separate multi-select, distinct from Category and Tech Stack */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-900 dark:text-white">
                    Portfolio Domains *
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                    {domains.length}/{MAX_PORTFOLIO_DOMAINS} selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
                  Pick 1–5 tags that describe this portfolio's visual/interaction experience (e.g. Three.js, GSAP, Parallax).
                </p>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20">
                  {PORTFOLIO_DOMAINS.map((domain) => {
                    const selected = domains.includes(domain);
                    const disabled = !selected && domains.length >= MAX_PORTFOLIO_DOMAINS;
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => handleToggleDomain(domain)}
                        disabled={disabled}
                        aria-pressed={selected}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
                          selected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-indigo-400"
                        )}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Single Image Upload (Max 2 MB, 1 Image Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-900 dark:text-white">
                    Cover Banner Image *
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                    Max 2 MB (PNG, JPG, WebP)
                  </span>
                </div>

                {/* File Upload Dropzone */}
                <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 rounded-xl p-3 text-center transition bg-slate-50/50 dark:bg-zinc-900/50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 py-1">
                    <Upload className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Click or drag & drop custom cover image
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                      PNG, JPG or WebP strictly up to 2.00 MB
                    </p>
                  </div>
                </div>

                {fileUploadError && (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fileUploadError}
                  </p>
                )}

                {isCompressingImage && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                    <span className="font-mono text-blue-800 dark:text-blue-300">Optimizing cover image...</span>
                  </div>
                )}

                {uploadedFile && !isCompressingImage && (
                  <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-mono text-emerald-800 dark:text-emerald-300 truncate">{uploadedFile.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                      {uploadedFile.size < 1024 * 1024
                        ? `${(uploadedFile.size / 1024).toFixed(0)} KB`
                        : `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`} (Optimized)
                    </span>
                  </div>
                )}

                {/* Or choose from Presets */}
                <div className="mt-3">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 block mb-1">
                    Or select a verified preset banner:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_THUMBNAILS.map((thumb) => (
                      <div
                        key={thumb.label}
                        onClick={() => {
                          setThumbnail(thumb.url);
                          setUploadedFile(null);
                        }}
                        className={cn(
                          "relative aspect-[16/10] rounded-xl overflow-hidden border cursor-pointer group transition-all",
                          thumbnail === thumb.url && !uploadedFile
                            ? "border-slate-900 dark:border-white ring-2 ring-slate-900/20 dark:ring-white/20 shadow-md"
                            : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500"
                        )}
                      >
                        <img
                          src={thumb.url}
                          alt={thumb.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 flex items-end p-1.5">
                          <span className="text-[10px] font-mono font-medium text-white truncate">
                            {thumb.label}
                          </span>
                        </div>
                        {thumbnail === thumb.url && !uploadedFile && (
                          <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-900">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tech Stack Chips */}
              <div>
                <label className="block text-xs font-medium text-slate-900 dark:text-white mb-1.5">
                  Technology Stack Tags *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-mono"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">Suggestions:</span>
                  {SUGGESTED_TECHS.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => handleAddTech(tech)}
                      disabled={techStack.includes(tech)}
                      className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-mono disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      +{tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description — Optional, min 200 chars if provided */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-900 dark:text-white">
                    Description <span className="text-slate-400 dark:text-zinc-500 font-normal">(optional)</span>
                  </label>
                  {descriptionChars > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-mono px-2 py-0.5 rounded font-medium",
                        descriptionChars >= MIN_DESCRIPTION_CHARACTERS
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                      )}
                    >
                      {descriptionChars} / {MIN_DESCRIPTION_CHARACTERS} chars
                    </span>
                  )}
                </div>
                <textarea
                  rows={5}
                  placeholder="Optional — add context about your portfolio, process, or approach (if provided, must be at least 200 characters)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-colors resize-none shadow-xs"
                />
                {descriptionChars > 0 && descriptionChars < MIN_DESCRIPTION_CHARACTERS && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>
                      Description needs at least {MIN_DESCRIPTION_CHARACTERS - descriptionChars} more character{MIN_DESCRIPTION_CHARACTERS - descriptionChars !== 1 ? "s" : ""}, or clear it entirely.
                    </span>
                  </p>
                )}
                {descriptionChars >= MIN_DESCRIPTION_CHARACTERS && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 flex-shrink-0" />
                    <span>Description length looks good ({descriptionChars} characters).</span>
                  </p>
                )}
              </div>

              {/* Request Roast / In-Depth Critique Toggle */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/50 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <label htmlFor="request-critique-toggle" className="text-xs font-semibold text-slate-900 dark:text-orange-200 flex items-center gap-1.5 cursor-pointer">
                    <span>🔥 Request Roast / In-Depth Critique</span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-orange-300/80 leading-relaxed">
                    Signal to reviewers that you actively welcome rigorous, no-holds-barred constructive critique, UX tear-downs, and code architecture feedback.
                  </p>
                </div>
                <input
                  id="request-critique-toggle"
                  type="checkbox"
                  checked={requestCritique}
                  onChange={(e) => setRequestCritique(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-medium transition-colors text-center cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing Portfolio...</span>
                    </>
                  ) : (
                    <span>Submit for Peer Review</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
