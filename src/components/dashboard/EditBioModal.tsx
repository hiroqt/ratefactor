"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  User, 
  MapPin, 
  Building2, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin, 
  FileText, 
  Check, 
  Plus, 
  Eye, 
  Edit3, 
  Image as ImageIcon 
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { DeveloperProfile } from "@/types/profile";
import { cn, normalizeAvatarUrl } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface EditBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DeveloperProfile;
  onSaveProfile: (updatedProfile: DeveloperProfile) => void;
}

const COMMON_SKILLS = [
  "TypeScript",
  "Rust",
  "Go",
  "Next.js 15",
  "React 19",
  "WASM",
  "Tailwind CSS",
  "Vitest",
  "WebGPU",
  "eBPF",
  "PostgreSQL",
  "GraphQL",
  "Docker",
  "Kubernetes",
];

const PRESET_AVATARS = [
  {
    label: "Default Avatar",
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Elena (Architect)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Marcus (Engineer)",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Devon (Systems)",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Aria (Design Engineer)",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Cyber Dev",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
  },
];

export function EditBioModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}: EditBioModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "readme" | "preview">("general");

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [role, setRole] = useState(profile.role);
  const [pronouns, setPronouns] = useState(profile.pronouns || "");
  const [bio, setBio] = useState(profile.bio);
  const [company, setCompany] = useState(profile.company || "");
  const [location, setLocation] = useState(profile.location || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [github, setGithub] = useState(profile.github || "");
  const [twitter, setTwitter] = useState(profile.twitter || "");
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [readmeMarkdown, setReadmeMarkdown] = useState(profile.readmeMarkdown || "");

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setUsername(profile.username);
      setAvatar(profile.avatar);
      setRole(profile.role);
      setPronouns(profile.pronouns || "");
      setBio(profile.bio);
      setCompany(profile.company || "");
      setLocation(profile.location || "");
      setWebsite(profile.website || "");
      setGithub(profile.github || "");
      setTwitter(profile.twitter || "");
      setLinkedin(profile.linkedin || "");
      setSkills(profile.skills || []);
      setReadmeMarkdown(profile.readmeMarkdown || "");
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
    deps: [activeTab],
  });

  if (!isOpen) return null;

  const handleAddSkill = (skillInput: string) => {
    const candidates = skillInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (candidates.length === 0) return;
    const newItems = candidates.filter((c) => !skills.includes(c));
    if (newItems.length > 0) {
      setSkills([...skills, ...newItems]);
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const rawGithub = github.trim();
    const cleanGithubHandle = rawGithub
      ? rawGithub.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "").replace(/^@/, "").trim()
      : "";
    const cleanGithubUrl = cleanGithubHandle ? `https://github.com/${cleanGithubHandle}` : "";

    onSaveProfile({
      ...profile,
      name: name.trim() || profile.name,
      username: profile.username,
      avatar: avatar.trim() || profile.avatar,
      role: role.trim() || profile.role,
      pronouns: pronouns.trim(),
      bio: bio.trim(),
      company: company.trim(),
      location: location.trim(),
      website: website.trim(),
      // A plain, unverified display link — same as website/twitter/linkedin
      // below. It must never mark GitHub as "connected": that state is
      // authoritative only via Better Auth's linked-account check (see
      // useGithubConnection), never from a freely-editable text field.
      github: cleanGithubUrl,
      twitter: twitter.trim(),
      linkedin: linkedin.trim(),
      skills,
      readmeMarkdown: readmeMarkdown.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
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
        aria-labelledby="edit-bio-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#121215] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 id="edit-bio-modal-title" className="font-bold text-slate-900 dark:text-white text-sm">
              Edit Developer Profile &amp; Bio
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/5 p-0.5 border border-slate-200 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all cursor-pointer",
                  activeTab === "general"
                    ? "bg-white dark:bg-[#1f1f23] text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Bio &amp; Links
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("readme")}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer",
                  activeTab === "readme"
                    ? "bg-white dark:bg-[#1f1f23] text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <FileText className="w-3 h-3" />
                README.md
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer",
                  activeTab === "preview"
                    ? "bg-white dark:bg-[#1f1f23] text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div ref={scrollRef} data-lenis-prevent="true" className="p-6 flex-1 overflow-y-auto overscroll-contain space-y-4">
            {activeTab === "general" && (
            <>
              {/* Avatar Selector & Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Profile Avatar (GitHub Style)</span>
                </label>

                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-white/10 flex-shrink-0 bg-white dark:bg-slate-800">
                    <img
                      src={normalizeAvatarUrl(avatar, username)}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://... (Image URL)"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Quick avatars:</span>
                      {PRESET_AVATARS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setAvatar(preset.url)}
                          className={cn(
                            "w-6 h-6 rounded-full overflow-hidden border transition-all cursor-pointer",
                            avatar === preset.url
                              ? "ring-2 ring-slate-900 dark:ring-white border-white scale-105"
                              : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"
                          )}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name, Username & Pronouns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white">
                      Handle / Username
                    </label>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Permanent</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400 dark:text-slate-500">@</span>
                    <input
                      type="text"
                      value={profile.username || username}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                    Pronouns
                  </label>
                  <input
                    type="text"
                    placeholder="he/him, they/them"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Headline / Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Professional Headline / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Principal Frontend Architect"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                />
              </div>

              {/* GitHub-style Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Bio (GitHub-Style)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Add a bio to tell other developers about your architectural expertise, interests, and what you build..."
                  className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400 resize-none"
                  maxLength={280}
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>Concise overview shown in profile header and card embeds</span>
                  <span>{bio.length}/280</span>
                </div>
              </div>

              {/* Company & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Company / Org
                  </label>
                  <input
                    type="text"
                    placeholder="@RateFactor or Independent"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400" /> Location
                  </label>
                  <input
                    type="text"
                    placeholder="San Francisco, CA or Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Website, GitHub, Twitter & LinkedIn */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-900 dark:text-white">
                  Social &amp; Developer Links
                </label>

                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-600 dark:text-cyan-400 flex-shrink-0" />
                  <input
                    type="url"
                    placeholder="https://yourwebsite.com (Personal Website)"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-slate-900 dark:text-white flex-shrink-0" />
                  <input
                    type="url"
                    placeholder="https://github.com/username (or @username)"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-sky-500 dark:text-cyan-400 flex-shrink-0" />
                  <input
                    type="url"
                    placeholder="https://x.com/username"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Skills Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                  Core Technologies &amp; Architectural Skills
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-mono"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. WebGL, Zig, comma-separated)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill(newSkill);
                      }
                    }}
                    className="flex-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(newSkill)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-wrap mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Quick picks:</span>
                  {COMMON_SKILLS.slice(0, 7).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={skills.includes(s)}
                      onClick={() => handleAddSkill(s)}
                      className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      +{s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "readme" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    {username} / README.md
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    GitHub-style special repository markdown displayed on your developer profile.
                  </p>
                </div>
              </div>

              <textarea
                rows={12}
                value={readmeMarkdown}
                onChange={(e) => setReadmeMarkdown(e.target.value)}
                placeholder="Write your developer README in Markdown..."
                className="w-full font-mono text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-900 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-[#18181b] resize-y"
              />

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold block mb-0.5 text-slate-900 dark:text-white">Markdown Tips:</span>
                Supports headers (<code>###</code>), bold (<code>**bold**</code>), lists (<code>- item</code>), links (<code>[text](url)</code>), and code blocks. Switch to the <strong>Preview</strong> tab above to see it rendered!
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              {/* Profile Card Preview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-white/10 flex-shrink-0 bg-white dark:bg-slate-800">
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{name}</h4>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">@{username}</span>
                      {pronouns && <span className="text-xs text-slate-400 dark:text-slate-500">({pronouns})</span>}
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">{role}</p>
                    {company && <p className="text-xs text-slate-500 dark:text-slate-400">{company} • {location}</p>}
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#18181b] p-3 rounded-xl border border-slate-200 dark:border-white/10 leading-relaxed break-words [overflow-wrap:anywhere]">
                  {bio || <span className="italic text-slate-400 dark:text-slate-500">No bio specified.</span>}
                </div>

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {skills.map((s) => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* README.md Preview Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/10 pb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Rendered README.md</span>
                </div>
                <div className="pt-2">
                  <MarkdownRenderer content={readmeMarkdown} />
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
