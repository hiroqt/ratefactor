"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ratefactor_bookmarked_ids";

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
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
