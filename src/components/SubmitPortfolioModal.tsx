"use client";

import React, { useState } from "react";
import { 
  X, 
  Terminal, 
  Upload, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Link as LinkIcon, 
  Github, 
  Globe,
  Eye,
  Plus
} from "lucide-react";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { PortfolioCard } from "./PortfolioCard";
import { cn } from "@/lib/utils";

interface SubmitPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPortfolio: Portfolio) => void;
  existingPortfolios: Portfolio[];
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
}: SubmitPortfolioModalProps) {
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState(PRESET_THUMBNAILS[0].url);
  const [category, setCategory] = useState<"Frontend" | "Fullstack" | "Systems" | "Design Engineer" | "Mobile" | "AI / ML">("Frontend");
  const [techStack, setTechStack] = useState<string[]>(["TypeScript", "Next.js 15"]);
  const [customTech, setCustomTech] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  if (!isOpen) return null;

  const handleAddTech = (tech: string) => {
    const trimmed = tech.trim();
    if (!trimmed || techStack.includes(trimmed)) return;
    setTechStack([...techStack, trimmed]);
    setCustomTech("");
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Required fields check
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!tagline.trim()) {
      setError("Project tagline / short description is required.");
      return;
    }
    if (!portfolioUrl.trim() || !validateUrl(portfolioUrl)) {
      setError("Please provide a valid Portfolio / Live URL (e.g. https://...).");
      return;
    }
    if (!githubUrl.trim() || !validateUrl(githubUrl)) {
      setError("Please provide a valid GitHub URL (e.g. https://github.com/...).");
      return;
    }
    if (techStack.length === 0) {
      setError("Please add at least one technology stack tag.");
      return;
    }

    // Duplicate submission check (PRD Section 4.2)
    const isDuplicate = existingPortfolios.some(
      (p) =>
        p.portfolioUrl.toLowerCase() === portfolioUrl.toLowerCase() ||
        p.githubUrl.toLowerCase() === githubUrl.toLowerCase() ||
        p.title.toLowerCase() === title.toLowerCase()
    );

    if (isDuplicate) {
      setError("Duplicate submission detected: A portfolio with this title or repository URL has already been indexed.");
      return;
    }

    const newPortfolio: Portfolio = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      tagline,
      description: description || tagline,
      portfolioUrl,
      githubUrl,
      demoUrl: demoUrl || portfolioUrl,
      thumbnail,
      author: {
        name: "Arnel Rivera",
        username: "arneldev",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        role: "Principal Frontend Architect",
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
        documentation: 5.0,
      },
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
    };

    onSubmit(newPortfolio);
    onClose();
  };

  const previewPortfolio: Portfolio = {
    id: "preview-id",
    title: title || "Your Project Title",
    tagline: tagline || "A concise, technically accurate description of what you engineered.",
    description: description || "Detailed architectural description...",
    portfolioUrl: portfolioUrl || "https://example.com",
    githubUrl: githubUrl || "https://github.com/user/repo",
    thumbnail,
    author: {
      name: "Arnel Rivera",
      username: "arneldev",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      role: "Principal Frontend Architect",
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
      documentation: 5.0,
    },
    likesCount: 1,
    isLiked: true,
    commentsCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand-400" />
            <h3 className="font-semibold text-foreground text-sm">
              Submit Portfolio for Peer Review
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-surface p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  activeTab === "form" ? "bg-surface-raised text-foreground" : "text-muted"
                )}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1",
                  activeTab === "preview" ? "bg-surface-raised text-foreground" : "text-muted"
                )}
              >
                <Eye className="w-3 h-3" />
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted hover:text-foreground transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "preview" ? (
            <div className="space-y-4">
              <div className="text-xs text-muted font-mono">
                Card preview as it will appear in the Discovery feed:
              </div>
              <div className="max-w-md mx-auto">
                <PortfolioCard
                  portfolio={previewPortfolio}
                  onSelect={() => {}}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title & Tagline */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyperion LSM Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Tagline / Technical Summary *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Embedded Log-Structured Merge tree in Rust with SIMD-accelerated SSTables"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* URLs: Portfolio & GitHub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-muted" /> Portfolio / Live URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                    <Github className="w-3.5 h-3.5 text-muted" /> GitHub Repository URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Domain Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Systems", "Frontend", "Fullstack", "Design Engineer", "Mobile", "AI / ML"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "py-1.5 px-2 rounded border text-xs font-medium transition-colors text-center",
                        category === cat
                          ? "bg-brand-500/20 text-brand-400 border-brand-500"
                          : "bg-surface-raised border-border text-muted hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Technology Stack *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-surface-raised border border-border text-foreground"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="text-muted hover:text-accent-rose"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a tech (e.g. WebGL, Zig, Docker) & press Enter..."
                    value={customTech}
                    onChange={(e) => setCustomTech(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech(customTech);
                      }
                    }}
                    className="flex-1 bg-surface-raised border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTech(customTech)}
                    className="px-3 py-1.5 rounded-md bg-surface-raised border border-border hover:border-border-hover text-xs font-medium text-foreground transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-muted-dark">Suggestions:</span>
                  {SUGGESTED_TECHS.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => handleAddTech(tech)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised/40 hover:bg-surface-raised border border-border/40 text-muted hover:text-foreground transition-colors"
                    >
                      + {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail Selector */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Thumbnail / Cover Imagery
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {PRESET_THUMBNAILS.map((preset) => (
                    <div
                      key={preset.label}
                      onClick={() => setThumbnail(preset.url)}
                      className={cn(
                        "relative aspect-video rounded overflow-hidden border cursor-pointer group",
                        thumbnail === preset.url ? "border-brand-500 ring-2 ring-brand-500/30" : "border-border"
                      )}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-background/80 text-[10px] font-mono py-0.5 text-center text-foreground truncate px-1">
                        {preset.label}
                      </span>
                    </div>
                  ))}
                </div>
                <input
                  type="url"
                  placeholder="Or paste custom image URL..."
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Long description */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Deep Architectural Rationale (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe memory model, trade-offs made, benchmarks, and testing strategies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted font-mono">
                  Enforces automated duplicate check & URL validation
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-md border border-border text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-400 text-background font-medium text-xs shadow-sm transition-all hover:shadow-glow"
                  >
                    Submit for Review
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
