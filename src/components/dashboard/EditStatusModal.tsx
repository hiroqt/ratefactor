"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { X, Smile, Check, Sparkles, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { UserStatus } from "@/types/profile";
import { STATUS_PRESETS } from "@/data/mockProfile";

interface EditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: UserStatus;
  onSaveStatus: (status: UserStatus) => void;
  userAvatar: string;
  userName: string;
}

const QUICK_EMOJIS = ["🚀", "🎯", "💻", "☕", "⚡", "🧠", "🌴", "🛠️", "🤝", "🔥", "🔬", "📐"];

export function EditStatusModal({
  isOpen,
  onClose,
  currentStatus,
  onSaveStatus,
  userAvatar,
  userName,
}: EditStatusModalProps) {
  const [emoji, setEmoji] = useState(
    currentStatus.emoji !== undefined ? currentStatus.emoji : "🚀"
  );
  const [message, setMessage] = useState(currentStatus.message || "");
  const [isBusy, setIsBusy] = useState(currentStatus.isBusy || false);
  const [statusType, setStatusType] = useState<"available" | "busy" | "focusing" | "offline">(
    currentStatus.statusType || "available"
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmoji(currentStatus.emoji !== undefined ? currentStatus.emoji : "🚀");
      setMessage(currentStatus.message || "");
      setIsBusy(currentStatus.isBusy || false);
      setStatusType(currentStatus.statusType || "available");
      setShowEmojiPicker(false);
    }
  }, [isOpen, currentStatus]);

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
  });

  if (!isOpen) return null;

  const handlePresetClick = (preset: (typeof STATUS_PRESETS)[0]) => {
    setEmoji(preset.emoji);
    setMessage(preset.message);
    setStatusType(preset.statusType);
    setIsBusy(preset.statusType === "busy");
  };

  const handleClearStatus = () => {
    setEmoji("");
    setMessage("");
    setIsBusy(false);
    setStatusType("available");
    onSaveStatus({
      emoji: "",
      message: "",
      isBusy: false,
      statusType: "available",
      updatedAt: "Cleared",
    });
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStatus({
      emoji: emoji.trim(),
      message: message.trim(),
      isBusy,
      statusType: isBusy ? "busy" : statusType,
      updatedAt: "Just now",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h3 id="status-modal-title" className="font-bold text-slate-900 text-sm">
              Set GitHub-Style Developer Status
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form ref={scrollRef} data-lenis-prevent="true" onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto overscroll-contain flex-1">
          {/* Live Status Preview Bubble */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-slate-200 flex-shrink-0">
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isBusy
                    ? "bg-amber-500"
                    : statusType === "offline"
                    ? "bg-slate-400"
                    : "bg-emerald-500"
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-500 font-medium">Public Status Preview</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {emoji ? (
                  <span className="text-base leading-none">{emoji}</span>
                ) : (
                  <span className="text-slate-400 text-xs">💭</span>
                )}
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {message || (emoji ? "Status set" : "What's happening?")}
                </span>
                {isBusy && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                    Busy
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Input Row */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Status Message &amp; Emoji
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-lg transition-all focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                  title="Choose status emoji"
                >
                  {emoji || <Smile className="w-4 h-4 text-slate-400" />}
                </button>

                {showEmojiPicker && (
                  <div className="absolute top-12 left-0 z-50 p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl w-60 space-y-2">
                    <div className="grid grid-cols-6 gap-1">
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            setEmoji(e);
                            setShowEmojiPicker(false);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-base flex items-center justify-center transition-colors cursor-pointer"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 flex justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setEmoji("");
                          setShowEmojiPicker(false);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-medium"
                      >
                        No emoji
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="What's happening? (e.g. Shipping RateFactor v2)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={80}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
              <span>Supports GitHub-compatible unicode emoji status</span>
              <span>{message.length}/80</span>
            </div>
          </div>

          {/* Busy Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="busy-status-toggle"
              checked={isBusy}
              onChange={(e) => {
                setIsBusy(e.target.checked);
                if (e.target.checked) setStatusType("busy");
              }}
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="busy-status-toggle" className="text-xs text-slate-700 cursor-pointer">
              <span className="font-semibold text-slate-900 block">Mark as Busy</span>
              <span className="text-[11px] text-slate-500">
                When peers mention you or review architectures, show you are focusing or busy.
              </span>
            </label>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
              Quick Suggestions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.message}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="p-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">
                    {preset.emoji}
                  </span>
                  <span className="truncate text-[11px]">{preset.message}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleClearStatus}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
            >
              Clear status
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-full bg-slate-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Set status
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
