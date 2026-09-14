"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Check, 
  AlertCircle, 
  User, 
  Camera, 
  Upload, 
  Github, 
  Google, 
  Twitter, 
  Linkedin, 
  Globe, 
  RefreshCw, 
  ShieldCheck, 
  ChevronRight,
  Plus
} from "@/components/ui/icons";
import { AVAILABLE_ROLES, DeveloperProfile } from "@/types/profile";
import { compressProfileImage } from "@/lib/image-compression";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export interface ProfileOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DeveloperProfile;
  onSaveSuccess: (updatedProfile: DeveloperProfile) => void;
  isGoogleUser?: boolean;
  hasGithubLinked?: boolean;
  isNewAccount?: boolean;
}

export function ProfileOnboardingModal({
  isOpen,
  onClose,
  profile,
  onSaveSuccess,
  isGoogleUser = false,
  hasGithubLinked = false,
  isNewAccount = false,
}: ProfileOnboardingModalProps) {
  const [fullName, setFullName] = useState(profile.name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [selectedRole, setSelectedRole] = useState<string>(profile.role || "User");
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [bio, setBio] = useState(profile.bio || "");
  const [github, setGithub] = useState(profile.github || "");
  const [twitter, setTwitter] = useState(profile.twitter || "");
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");
  const [website, setWebsite] = useState(profile.website || "");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar || "");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync state when profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName(profile.name || "");
      setUsername(profile.username || "");
      const roleFound = (AVAILABLE_ROLES as readonly string[]).includes(profile.role);
      if (roleFound) {
        setSelectedRole(profile.role);
        setIsCustomRole(false);
        setCustomRoleInput("");
      } else if (profile.role && profile.role !== "developer") {
        setSelectedRole("Custom");
        setIsCustomRole(true);
        setCustomRoleInput(profile.role);
      } else {
        setSelectedRole("User");
        setIsCustomRole(false);
        setCustomRoleInput("");
      }
      setBio(profile.bio || "");
      setGithub(profile.github || "");
      setTwitter(profile.twitter || "");
      setLinkedin(profile.linkedin || "");
      setWebsite(profile.website || "");
      setAvatarUrl(profile.avatar || "");
      setError(null);
    }
  }, [isOpen, profile]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving && !isCompressing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSaving, isCompressing]);

  // Handle image upload & compression
  const handleImageFile = async (file: File) => {
    setError(null);
    setIsCompressing(true);
    try {
      const result = await compressProfileImage(file, {
        maxDimension: 512,
        initialQuality: 0.85,
        maxSizeBytes: 2 * 1024 * 1024,
      });

      setAvatarUrl(result.dataUrl);
    } catch (err: any) {
      setError(err?.message || "Failed to process profile image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    try {
      await authClient.linkSocial({
        provider: "github",
        callbackURL: typeof window !== "undefined" ? window.location.href : "/profile",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initiate GitHub link.");
      setIsConnectingGithub(false);
    }
  };

  const handleSave = async () => {
    setError(null);

    const trimmedName = fullName.trim();
    const cleanUsername = username.replace(/^@/, "").trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (cleanUsername.length > 30) {
      setError("Username must not exceed 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    const finalName = trimmedName || profile.name || cleanUsername || "User";
    const finalRole = isCustomRole ? (customRoleInput.trim() || "User") : selectedRole;

    setIsSaving(true);
    try {
      const payload = {
        name: finalName,
        username: cleanUsername,
        role: finalRole,
        avatar: avatarUrl,
        bio: bio.trim(),
        github: github.trim(),
        twitter: twitter.trim(),
        linkedin: linkedin.trim(),
        website: website.trim(),
        onboarded: true,
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to update profile.");
      }

      const updated = data.profile || {
        ...profile,
        ...payload,
      };

      onSaveSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded: true }),
      });
      onSaveSuccess({
        ...profile,
        onboarded: true,
      });
    } catch {
      // Gracefully ignore network failures during skip
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 text-slate-900 dark:text-white max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient highlight */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="onboarding-modal-title" className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {isNewAccount ? "Welcome to RateFactor" : "Configure Profile"}
                </h3>
                {isNewAccount && (
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    New Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure your public developer identity and professional discipline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Account Creation Success Banner - Only shown for genuinely new accounts */}
          {isNewAccount && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  Account created successfully!
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs leading-relaxed">
                  Welcome to RateFactor. Set up your public profile and role to get started.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {/* 1. Identity: Avatar & Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Avatar upload with compression */}
            <div className="sm:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                Profile Picture
              </label>
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 shadow-inner flex items-center justify-center relative">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center p-2">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">Upload</span>
                    </div>
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    <Camera className="w-4 h-4 mr-1" />
                    <span>Change</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors"
                  aria-label="Upload photo"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />

              <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                Max image size: 2 MB
              </span>
            </div>

            {/* Name & Username Inputs */}
            <div className="sm:col-span-8 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  maxLength={80}
                  className="mt-1 w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Username / Handle</span>
                  <span className="text-[11px] text-slate-400 font-mono">3–10 chars</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 10))}
                    placeholder="alexchen"
                    maxLength={10}
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Role Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Select Your Role / Discipline
              </label>
              <span className="text-[11px] text-slate-400">Default: User</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_ROLES.map((role) => {
                const isSelected = !isCustomRole && selectedRole.toLowerCase() === role.toLowerCase();
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setIsCustomRole(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-white dark:text-slate-900 dark:border-white"
                        : "bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <span>{role}</span>
                    {role === "User" && (
                      <span className={cn(
                        "ml-1.5 text-[10px] px-1 py-0.2 rounded font-mono",
                        isSelected ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"
                      )}>
                        default
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom Role Option */}
              <button
                type="button"
                onClick={() => setIsCustomRole(true)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer",
                  isCustomRole
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                    : "bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                )}
              >
                <Plus className="w-3 h-3" />
                <span>Custom Role</span>
              </button>
            </div>

            {isCustomRole && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2"
              >
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  placeholder="e.g. Distributed Systems Engineer / Core Architect"
                  maxLength={60}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white font-medium"
                />
              </motion.div>
            )}
          </div>

          {/* 3. Google User -> Connect GitHub Option */}
          {(isGoogleUser || !hasGithubLinked) && (
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-zinc-800/60 dark:to-zinc-800/30 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Connect GitHub</span>
                      {hasGithubLinked ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          <Check className="w-3 h-3" /> Linked
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded text-slate-600 dark:text-zinc-300 font-mono">
                          Recommended
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                      Showcase repositories, contributions, and streaks on your profile.
                    </p>
                  </div>
                </div>

                {!hasGithubLinked ? (
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    disabled={isConnectingGithub}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-900 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isConnectingGithub ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Github className="w-3.5 h-3.5" />
                    )}
                    <span>Link GitHub</span>
                  </button>
                ) : (
                  <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Bio (Optional) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Bio <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">{bio.length}/500</span>
            </div>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about your work, architecture focus, or interests..."
              maxLength={500}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* 5. Social Links (Optional) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Social Profiles &amp; Web <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Github className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="github.com/username"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="relative">
                <Twitter className="w-3.5 h-3.5 absolute left-3 top-2.5 text-sky-500" />
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="twitter.com/username"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="relative">
                <Linkedin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-blue-600" />
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourportfolio.dev"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-medium cursor-pointer transition-colors"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isCompressing}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Complete Setup</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ProfileOnboardingModal;
