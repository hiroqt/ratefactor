"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Instagram,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Star,
  Sparkles,
  Link as LinkIcon,
  Palette,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { DeveloperProfile } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { formatRating, normalizeAvatarUrl, cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface InstagramStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DeveloperProfile;
  portfolios?: Portfolio[];
}

type StoryTheme = "obsidian" | "cyber" | "frost";

export function InstagramStoryModal({
  isOpen,
  onClose,
  profile,
  portfolios = [],
}: InstagramStoryModalProps) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [theme, setTheme] = useState<StoryTheme>("obsidian");

  const username = profile.username || "developer";
  const displayName = profile.name || username;
  const role = profile.role || profile.bio?.slice(0, 45) || "Software Engineer & Architect";
  const projectCount = portfolios.length;

  const avgRating =
    portfolios.length > 0
      ? portfolios.reduce((acc, p) => acc + (p.rating || 0), 0) / portfolios.length
      : 5.0;
  const totalReviews = portfolios.reduce(
    (acc, p) => acc + (p.ratingCount || 0) + (p.commentsCount || 0),
    0
  );
  const ratingScore = avgRating > 0 ? avgRating : 5.0;
  const reviewCount = totalReviews;

  const catchyHeadline = "Software Architecture & Developer Portfolio";
  const catchyDescription = `Explore verified engineering blueprints, system designs, and reviews on RateFactor.`;

  const getProfileUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/u/${encodeURIComponent(username)}`;
    }
    return `https://ratefactor.dev/u/${username}`;
  }, [username]);

  // Detect native file sharing capability
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyLink = () => {
    const url = getProfileUrl();
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Profile URL copied for Instagram Link Sticker.");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Generate ultra-crisp 1080x1920 Instagram Story Canvas
  const generateStoryCanvas = async (selectedTheme: StoryTheme): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    // Helper: draw rounded rectangle
    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill?: string,
      stroke?: string,
      strokeW = 1
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
    };

    // 1. Background Setup
    if (selectedTheme === "cyber") {
      const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
      bg.addColorStop(0, "#090514");
      bg.addColorStop(0.5, "#130924");
      bg.addColorStop(1, "#05020a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1920);

      const glow1 = ctx.createRadialGradient(200, 300, 20, 200, 300, 600);
      glow1.addColorStop(0, "rgba(217, 70, 239, 0.28)");
      glow1.addColorStop(1, "rgba(217, 70, 239, 0)");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 1080, 900);

      const glow2 = ctx.createRadialGradient(880, 1500, 30, 880, 1500, 650);
      glow2.addColorStop(0, "rgba(16, 185, 129, 0.24)");
      glow2.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 900, 1080, 1020);
    } else if (selectedTheme === "frost") {
      const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(0.5, "#1e293b");
      bg.addColorStop(1, "#090d16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1920);

      const glow = ctx.createRadialGradient(540, 600, 50, 540, 600, 700);
      glow.addColorStop(0, "rgba(56, 189, 248, 0.2)");
      glow.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1920);
    } else {
      // Obsidian (Default)
      const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
      bg.addColorStop(0, "#070b14");
      bg.addColorStop(0.45, "#0c1328");
      bg.addColorStop(1, "#04060d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1920);

      const glowTop = ctx.createRadialGradient(220, 280, 20, 220, 280, 550);
      glowTop.addColorStop(0, "rgba(99, 102, 241, 0.25)");
      glowTop.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, 1080, 850);

      const glowBottom = ctx.createRadialGradient(860, 1550, 30, 860, 1550, 600);
      glowBottom.addColorStop(0, "rgba(14, 165, 233, 0.2)");
      glowBottom.addColorStop(1, "rgba(14, 165, 233, 0)");
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, 950, 1080, 970);
    }

    // 2. Subtle Grid overlay
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    for (let x = 60; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    for (let y = 60; y < 1920; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 3. Instagram Story Top Bars Simulation
    const barCount = 3;
    const barGap = 12;
    const totalBarW = 920;
    const singleBarW = (totalBarW - (barCount - 1) * barGap) / barCount;
    for (let i = 0; i < barCount; i++) {
      const bx = 80 + i * (singleBarW + barGap);
      drawRoundRect(bx, 80, singleBarW, 6, 3, i === 0 ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.3)");
    }

    // 4. RateFactor Header Badges
    drawRoundRect(80, 125, 420, 64, 32, "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.16)", 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("RATEFACTOR", 120, 166);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("/ DEV ARCHITECTURE", 280, 166);

    // Verified Pill
    drawRoundRect(680, 125, 320, 64, 32, "rgba(16, 185, 129, 0.15)", "rgba(16, 185, 129, 0.35)", 2);
    ctx.fillStyle = "#34d399";
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("VERIFIED PROFILE", 730, 165);

    // 5. Main Hero Profile Card
    const cardX = 80;
    const cardY = 220;
    const cardW = 920;
    const cardH = 1380;

    // Card background & glowing border
    drawRoundRect(cardX, cardY, cardW, cardH, 52, "rgba(15, 23, 42, 0.88)", "rgba(255, 255, 255, 0.16)", 3);

    // Inner top glow
    const innerCardGlow = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 400);
    innerCardGlow.addColorStop(0, selectedTheme === "cyber" ? "rgba(217, 70, 239, 0.15)" : "rgba(99, 102, 241, 0.15)");
    innerCardGlow.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = innerCardGlow;
    ctx.fillRect(cardX + 4, cardY + 4, cardW - 8, 380);

    // 6. Avatar
    const avatarCenterX = 540;
    const avatarCenterY = 410;
    const avatarRadius = 115;

    // Avatar ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = selectedTheme === "cyber" ? "rgba(217, 70, 239, 0.9)" : "rgba(129, 140, 248, 0.9)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();

    try {
      const avatarUrl = normalizeAvatarUrl(profile.avatar, username);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = avatarUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        setTimeout(reject, 2000);
      });
      ctx.drawImage(img, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 90px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(displayName.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY + 30);
    }
    ctx.restore();

    // 7. Developer Name & Username
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(displayName.slice(0, 28), 540, 605);

    ctx.fillStyle = selectedTheme === "cyber" ? "#f472b6" : "#818cf8";
    ctx.font = "600 32px 'SF Mono', Monaco, Menlo, monospace";
    ctx.fillText(`@${username}`, 540, 660);

    // 8. Role Pill
    const roleText = role.length > 40 ? role.slice(0, 37) + "..." : role;
    drawRoundRect(220, 700, 640, 60, 30, "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.16)", 1.5);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(roleText, 540, 739);

    // 9. Short Catchy Callout Box (Clean, NO EMOJIS)
    drawRoundRect(140, 795, 800, 165, 28, "rgba(30, 41, 59, 0.75)", "rgba(99, 102, 241, 0.4)", 2);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(catchyHeadline.toUpperCase(), 540, 845);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "normal 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Discover verified system designs, engineering blueprints,", 540, 895);
    ctx.fillText("and software reviews on RateFactor.", 540, 925);

    // 10. Metrics Row (Rating, Projects, Reviews)
    const statsY = 995;
    const statBoxW = 245;
    const statBoxH = 150;
    const statGap = 28;
    const statStartX = 145;

    // Metric 1: Rating
    drawRoundRect(statStartX, statsY, statBoxW, statBoxH, 22, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.1)", 1.5);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(formatRating(ratingScore), statStartX + statBoxW / 2, statsY + 68);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("COMMUNITY SCORE", statStartX + statBoxW / 2, statsY + 112);

    // Metric 2: Projects
    drawRoundRect(statStartX + statBoxW + statGap, statsY, statBoxW, statBoxH, 22, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.1)", 1.5);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${projectCount}`, statStartX + statBoxW + statGap + statBoxW / 2, statsY + 68);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("PROJECT SHOWCASES", statStartX + statBoxW + statGap + statBoxW / 2, statsY + 112);

    // Metric 3: Reviews
    drawRoundRect(statStartX + (statBoxW + statGap) * 2, statsY, statBoxW, statBoxH, 22, "rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.1)", 1.5);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`${reviewCount}`, statStartX + (statBoxW + statGap) * 2 + statBoxW / 2, statsY + 68);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("PEER REVIEWS", statStartX + (statBoxW + statGap) * 2 + statBoxW / 2, statsY + 112);

    // 11. Skills / Stack Pills
    const skills =
      profile.skills && profile.skills.length > 0
        ? profile.skills.slice(0, 4)
        : ["Architecture", "Full-Stack", "System Design", "Cloud"];

    ctx.fillStyle = "#64748b";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("CORE DOMAINS & EXPERTISE", 540, 1195);

    const pillY = 1220;
    const pillH = 48;
    const pillPadding = 30;
    const pillGap = 16;
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    const pillWidths = skills.map((s) => ctx.measureText(s.toUpperCase()).width + pillPadding * 2);
    const totalSkillsW = pillWidths.reduce((a, b) => a + b, 0) + (skills.length - 1) * pillGap;
    let currPillX = (1080 - totalSkillsW) / 2;

    skills.forEach((skill, idx) => {
      const w = pillWidths[idx];
      drawRoundRect(currPillX, pillY, w, pillH, 24, "rgba(99, 102, 241, 0.18)", "rgba(129, 140, 248, 0.35)", 1);
      ctx.fillStyle = "#e0e7ff";
      ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(skill.toUpperCase(), currPillX + w / 2, pillY + 31);
      currPillX += w + pillGap;
    });

    // 12. Instagram Real-Style Link Sticker
    const stickerY = 1320;
    drawRoundRect(200, stickerY, 680, 140, 36, "rgba(255, 255, 255, 0.96)", "rgba(255, 255, 255, 0.4)", 4);
    
    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("TAP LINK STICKER", 540, stickerY + 46);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 36px 'SF Mono', Monaco, Menlo, monospace";
    ctx.fillText(`ratefactor.dev/u/${username}`, 540, stickerY + 98);

    // 13. Outer Bottom Branding
    ctx.fillStyle = "#475569";
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("RATEFACTOR.DEV — VERIFIED DEVELOPER ARCHITECTURE PLATFORM", 540, 1780);

    return canvas;
  };

  const handleDownloadStoryImage = async () => {
    try {
      setIsGenerating(true);
      const canvas = await generateStoryCanvas(theme);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ratefactor-story-${username}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Story card downloaded! Ready to add to your Instagram Story.");
    } catch (err) {
      console.error("Canvas generation failed:", err);
      toast.error("Failed to generate story image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      setIsGenerating(true);
      const canvas = await generateStoryCanvas(theme);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));

      if (!blob) throw new Error("Could not create image blob");

      const file = new File([blob], `ratefactor-${username}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${displayName}'s Developer Architecture Portfolio`,
          text: catchyDescription,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else if (navigator.share) {
        await navigator.share({
          title: `${displayName}'s Developer Architecture Portfolio`,
          text: catchyDescription,
          url: getProfileUrl(),
        });
        toast.success("Link shared!");
      } else {
        await handleDownloadStoryImage();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Native share error:", err);
        await handleDownloadStoryImage();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-story-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Instagram className="w-4 h-4" />
            </div>
            <div>
              <h3 id="instagram-story-title" className="text-sm font-bold text-white">
                Share to Instagram Story
              </h3>
              <p className="text-[11px] text-slate-400">
                Embedded 9:16 profile preview ready for Instagram Stories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* LEFT: 9:16 Instagram Story Preview */}
          <div className="md:col-span-6 flex flex-col items-center">
            
            {/* Story Phone Frame */}
            <div
              className={cn(
                "relative w-full max-w-[280px] sm:max-w-[310px] aspect-[9/16] rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col justify-between select-none border transition-all duration-300",
                theme === "cyber"
                  ? "bg-gradient-to-b from-[#0e0720] via-[#150a2e] to-[#06020c] border-fuchsia-500/20"
                  : theme === "frost"
                  ? "bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#090d16] border-sky-500/20"
                  : "bg-gradient-to-b from-[#0a0f1d] via-[#0d162c] to-[#050813] border-white/10"
              )}
            >
              {/* Background ambient lighting */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-40 blur-2xl pointer-events-none transition-colors",
                  theme === "cyber" ? "bg-fuchsia-500/20" : theme === "frost" ? "bg-sky-500/20" : "bg-indigo-500/20"
                )}
              />
              <div
                className={cn(
                  "absolute bottom-0 right-0 w-40 h-40 blur-2xl pointer-events-none transition-colors",
                  theme === "cyber" ? "bg-emerald-500/20" : theme === "frost" ? "bg-cyan-500/20" : "bg-emerald-500/15"
                )}
              />

              {/* Instagram Story Progress Bars */}
              <div className="relative z-10 grid grid-cols-3 gap-1.5 pt-0.5">
                <div className="h-1 rounded-full bg-white" />
                <div className="h-1 rounded-full bg-white/30" />
                <div className="h-1 rounded-full bg-white/30" />
              </div>

              {/* Story Top Header Bar */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white">
                  <span className="font-bold text-indigo-400">RATEFACTOR</span>
                  <span className="text-slate-400">/ SHOWCASE</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIED</span>
                </div>
              </div>

              {/* Profile Main Body */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-2.5">
                
                {/* Avatar with Glow Ring */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-lg bg-slate-800 border border-white/10 ring-3 transition-colors",
                      theme === "cyber" ? "ring-fuchsia-400" : theme === "frost" ? "ring-sky-400" : "ring-indigo-400"
                    )}
                  >
                    <img
                      src={normalizeAvatarUrl(profile.avatar, username)}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
                      }}
                    />
                  </div>
                </div>

                {/* Name & Handle */}
                <div className="space-y-0.5">
                  <h4 className="text-base font-bold text-white tracking-tight line-clamp-1">
                    {displayName}
                  </h4>
                  <p
                    className={cn(
                      "text-xs font-mono font-medium",
                      theme === "cyber" ? "text-fuchsia-300" : "text-indigo-400"
                    )}
                  >
                    @{username}
                  </p>
                </div>

                {/* Role Pill */}
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium max-w-full truncate">
                  {role}
                </div>

                {/* Short Catchy Box (NO EMOJIS) */}
                <div className="w-full p-2.5 rounded-2xl bg-slate-800/80 border border-indigo-500/30 text-left space-y-1">
                  <div className="text-[10px] font-bold text-sky-400 tracking-wide uppercase">
                    {catchyHeadline}
                  </div>
                  <div className="text-[10px] text-slate-300 leading-tight">
                    {catchyDescription}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1.5 w-full">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-xs font-bold text-amber-400">{formatRating(ratingScore)}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-medium">Rating</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-xs font-bold text-sky-400">{projectCount}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-medium">Projects</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                    <div className="text-xs font-bold text-emerald-400">{reviewCount}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-medium">Reviews</div>
                  </div>
                </div>

                {/* Skills tags */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="flex items-center justify-center gap-1 flex-wrap pt-0.5">
                    {profile.skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[9px] font-medium font-mono"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Instagram Real-Style Link Sticker Widget */}
              <div className="relative z-10 p-2.5 rounded-2xl bg-white text-slate-900 text-center shadow-lg space-y-0.5 border border-slate-200">
                <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-sky-600 tracking-wider uppercase">
                  <LinkIcon className="w-3 h-3" />
                  <span>Tap Link Sticker</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-900">
                  ratefactor.dev/u/{username}
                </div>
              </div>
            </div>

            {/* Theme Selector Pills */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[11px] text-slate-400 font-medium">Theme:</span>
              <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setTheme("obsidian")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer",
                    theme === "obsidian" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  )}
                >
                  Obsidian
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("cyber")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer",
                    theme === "cyber" ? "bg-fuchsia-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  )}
                >
                  Cyber
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("frost")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer",
                    theme === "frost" ? "bg-sky-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  )}
                >
                  Frost
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: Primary Actions and 3-Step Guide */}
          <div className="md:col-span-6 space-y-5">
            <div>
              <h4 className="text-lg font-bold text-white tracking-tight">
                Export &amp; Share to Story
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Download a pixel-perfect 1080×1920 Story Card. Paste your profile link sticker directly on Instagram Stories so viewers can open your portfolio with 1 tap.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadStoryImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGenerating ? "Rendering High-Res Story Card..." : "Download Story Card (PNG)"}</span>
              </button>

              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-xl shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Share to Instagram / Stories</span>
                </button>
              )}
            </div>

            {/* Profile Link Sticker Copy Box */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Profile URL for Link Sticker
                </span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Instagram Link Sticker
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
                <div className="truncate font-mono text-[11px] text-slate-300 select-all">
                  {getProfileUrl()}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step-by-Step Instagram Story Guide */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                How to post on Instagram Story:
              </div>

              <div className="space-y-2.5 text-xs text-slate-400">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <span>
                    Tap <strong>Download Story Card</strong> to save the 1080×1920 image to your camera roll.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <span>
                    Open <strong>Instagram Stories</strong> and select the downloaded card image.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <span>
                    Tap the <strong>Sticker</strong> icon, select <strong>Link</strong>, paste your profile URL, and publish!
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
