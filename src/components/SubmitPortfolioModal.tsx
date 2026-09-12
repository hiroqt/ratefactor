"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  Terminal, 
  Upload, 
  Check, 
  AlertCircle, 
  Link as LinkIcon, 
  Github, 
  Globe,
  Eye,
  Plus,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { PortfolioCard } from "./PortfolioCard";
import { cn, isValidHttpUrl, normalizeUrl } from "@/lib/utils";
import { 
  validatePortfolioDescription, 
  validateImageUpload, 
  MIN_DESCRIPTION_CHARACTERS,
} from "@/lib/guardrails";

interface SubmitPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPortfolio: Portfolio) => void;
  existingPortfolios: Portfolio[];
  profile?: DeveloperProfile;
  currentUser?: any;
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
  const [customTech, setCustomTech] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  // Single image upload & quota tracking (Free tier standard: Max 2 MB, 1 image)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Description character count (optional field, min 200 chars if provided)
  const descriptionChars = description.trim().length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageUpload(file);
    if (!validation.isValid) {
      setFileUploadError(validation.error || "File exceeds maximum size of 2 MB.");
      return;
    }

    setFileUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setUploadedFile({ name: file.name, size: file.size, url });
      setThumbnail(url);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle("");
    setTagline("");
    setDescription("");
    setPortfolioUrl("");
    setGithubUrl("");
    setDemoUrl("");
    setThumbnail(PRESET_THUMBNAILS[0].url);
    setUploadedFile(null);
    setFileUploadError(null);
    setCategory("Developer");
    setTechStack(["TypeScript", "Next.js 15"]);
    setCustomTech("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setError("Duplicate submission detected: A portfolio with this title or repository URL has already been indexed.");
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
      description: description.trim() || tagline.trim(),
      portfolioUrl: portfolioUrl.trim(),
      githubUrl: githubUrl.trim(),
      demoUrl: demoUrl.trim() || portfolioUrl.trim(),
      thumbnail,
      author: {
        name: currentUser?.name || profile?.name || "Developer",
        username: currentUser?.username || profile?.username || "developer",
        avatar: currentUser?.avatar || profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        role: currentUser?.role || profile?.role || "Software Engineer",
        isVerified: true,
      },
      techStack,
      category,
      rating: 5.0,
      ratingCount: 1,
      ratingBreakdown: {
        design: 5.0,
        codeQuality: 5.0,
        performance: 5.0,
      },
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
    };

    onSubmit(newPortfolio);
    resetForm();
    onClose();
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
      name: currentUser?.name || profile?.name || "Arnel Rivera",
      username: currentUser?.username || profile?.username || "arneldev",
      avatar: currentUser?.avatar || profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      role: currentUser?.role || profile?.role || "Principal Architect",
      isVerified: true,
    },
    techStack: techStack.length > 0 ? techStack : ["TypeScript", "Next.js"],
    category,
    rating: 5.0,
    ratingCount: 1,
    ratingBreakdown: {
      design: 5.0,
      codeQuality: 5.0,
      performance: 5.0,
    },
    likesCount: 1,
    isLiked: true,
    commentsCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
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
        className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 id="submit-modal-title" className="font-bold text-slate-900 text-sm truncate">
              <span className="hidden sm:inline">Submit Portfolio for Peer Review</span>
              <span className="sm:hidden">Submit Portfolio</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={cn(
                  "px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all",
                  activeTab === "form" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-2.5 sm:px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  activeTab === "preview" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} data-lenis-prevent="true" className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "preview" ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live registry rendering preview:
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
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyperion LSM Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Tagline / Technical Summary *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Embedded Log-Structured Merge tree in Rust with SIMD-accelerated SSTables"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors shadow-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-600" /> Live Demo URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1 flex items-center gap-1">
                    <Github className="w-3 h-3 text-emerald-600" /> GitHub Repository *
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/user/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1">
                  Primary Domain *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition-colors shadow-xs"
                >
                  <optgroup label="Portfolio Type">
                    <option value="Developer">Developer Portfolio</option>
                    <option value="Arts">Arts Portfolio</option>
                    <option value="Client">Client Portfolio</option>
                  </optgroup>
                  <optgroup label="Technical Domain">
                    <option value="Frontend">Frontend Architecture</option>
                    <option value="Systems">Systems &amp; Low-Level</option>
                    <option value="Fullstack">Fullstack / Cloud</option>
                    <option value="Design Engineer">Design Engineering</option>
                    <option value="AI / ML">AI / Machine Learning</option>
                    <option value="Mobile">Mobile Native</option>
                  </optgroup>
                </select>
              </div>

              {/* Single Image Upload (Max 2 MB, 1 Image Only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-900">
                    Cover Banner Image *
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Max 2 MB (PNG, JPG, WebP)
                  </span>
                </div>

                {/* File Upload Dropzone */}
                <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 py-1">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-700">
                      Click or drag & drop custom cover image
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      PNG, JPG or WebP strictly up to 2.00 MB
                    </p>
                  </div>
                </div>

                {fileUploadError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fileUploadError}
                  </p>
                )}

                {uploadedFile && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono text-emerald-800 truncate">{uploadedFile.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 shrink-0">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB / 2.00 MB
                    </span>
                  </div>
                )}

                {/* Or choose from Presets */}
                <div className="mt-3">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1">
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
                            ? "border-slate-900 ring-2 ring-slate-900/20 shadow-md"
                            : "border-slate-200 hover:border-slate-300"
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
                          <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-slate-900 text-white">
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
                <label className="block text-xs font-medium text-slate-900 mb-1.5">
                  Technology Stack Tags *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] font-mono text-slate-400">Suggestions:</span>
                  {SUGGESTED_TECHS.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => handleAddTech(tech)}
                      disabled={techStack.includes(tech)}
                      className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-mono disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      +{tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description — Optional, min 200 chars if provided */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-900">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  {descriptionChars > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-mono px-2 py-0.5 rounded font-medium",
                        descriptionChars >= MIN_DESCRIPTION_CHARACTERS
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
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
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors resize-none shadow-xs"
                />
                {descriptionChars > 0 && descriptionChars < MIN_DESCRIPTION_CHARACTERS && (
                  <p className="text-[11px] text-amber-600 font-mono mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>
                      Description needs at least {MIN_DESCRIPTION_CHARACTERS - descriptionChars} more character{MIN_DESCRIPTION_CHARACTERS - descriptionChars !== 1 ? "s" : ""}, or clear it entirely.
                    </span>
                  </p>
                )}
                {descriptionChars >= MIN_DESCRIPTION_CHARACTERS && (
                  <p className="text-[11px] text-emerald-600 font-mono mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 flex-shrink-0" />
                    <span>Description length looks good ({descriptionChars} characters).</span>
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors text-center cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center"
                >
                  Submit for Peer Review
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
