"use client";

import { useState, useEffect, useCallback } from "react";
import { getClientGuestBookmarks, setClientGuestBookmarks } from "@/lib/cookies";

const STORAGE_KEY = "ratefactor_bookmarked_ids";

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      // 1. Prioritize cookie bookmarks for SSR alignment, fallback to localStorage
      const cookieBookmarks = getClientGuestBookmarks();
      if (cookieBookmarks && cookieBookmarks.length > 0) {
        setBookmarkedIds(cookieBookmarks);
        return;
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setBookmarkedIds(parsed);
        setClientGuestBookmarks(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleBookmark = useCallback((portfolioId: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(portfolioId)
        ? prev.filter((id) => id !== portfolioId)
        : [...prev, portfolioId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setClientGuestBookmarks(next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (portfolioId: string) => bookmarkedIds.includes(portfolioId),
    [bookmarkedIds]
  );

  return {
    bookmarkedIds,
    toggleBookmark,
    isBookmarked,
  };
}
