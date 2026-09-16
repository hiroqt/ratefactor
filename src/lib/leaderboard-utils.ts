import type { Portfolio } from "@/types/portfolio";

/**
 * Returns UTC timestamp for start of current calendar day (00:00:00.000 UTC).
 */
export function getStartOfTodayUtc(referenceDate?: Date | number): number {
  const d = referenceDate ? new Date(referenceDate) : new Date();
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return utc.getTime();
}

/**
 * Returns UTC timestamp for start of current ISO week (Monday 00:00:00.000 UTC).
 */
export function getStartOfWeekUtc(referenceDate?: Date | number): number {
  const d = referenceDate ? new Date(referenceDate) : new Date();
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = (day + 6) % 7; // days since Monday
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday, 0, 0, 0, 0));
  return utc.getTime();
}

/**
 * Checks whether a given date or timestamp falls within the current UTC calendar day.
 */
export function isWithinCurrentDay(date?: string | Date | number | null, referenceDate?: Date | number): boolean {
  if (!date) return false;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return false;
  const startOfDay = getStartOfTodayUtc(referenceDate);
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  return t >= startOfDay && t < endOfDay;
}

/**
 * Checks whether a given date or timestamp falls within the current UTC week (Monday to Sunday).
 */
export function isWithinCurrentWeek(date?: string | Date | number | null, referenceDate?: Date | number): boolean {
  if (!date) return false;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return false;
  const startOfWeek = getStartOfWeekUtc(referenceDate);
  const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000;
  return t >= startOfWeek && t < endOfWeek;
}

/**
 * Returns upvotes for the current day for a portfolio.
 * Prefers explicit `todayLikesCount`. If undefined and portfolio was created today,
 * defaults to `likesCount`; otherwise 0.
 */
export function getTodayUpvotes(portfolio: Portfolio, referenceDate?: Date | number): number {
  if (typeof portfolio.todayLikesCount === "number") {
    return Math.max(0, portfolio.todayLikesCount);
  }
  if (isWithinCurrentDay(portfolio.createdAt, referenceDate)) {
    return Math.max(0, portfolio.likesCount || 0);
  }
  return 0;
}

/**
 * Returns upvotes for the current week for a portfolio.
 * Prefers explicit `weekLikesCount`. If undefined and portfolio was created this week,
 * defaults to `likesCount`; otherwise 0.
 */
export function getWeekUpvotes(portfolio: Portfolio, referenceDate?: Date | number): number {
  if (typeof portfolio.weekLikesCount === "number") {
    return Math.max(0, portfolio.weekLikesCount);
  }
  if (isWithinCurrentWeek(portfolio.createdAt, referenceDate)) {
    return Math.max(0, portfolio.likesCount || 0);
  }
  return 0;
}

/**
 * Returns overall all-time upvotes for a portfolio.
 */
export function getAllTimeUpvotes(portfolio: Portfolio): number {
  return Math.max(0, portfolio.likesCount || 0);
}

/**
 * Returns the relevant upvote count for the given leaderboard tab.
 */
export function getDisplayUpvotes(
  portfolio: Portfolio,
  tab: "today" | "week" | "all",
  referenceDate?: Date | number
): number {
  if (tab === "today") return getTodayUpvotes(portfolio, referenceDate);
  if (tab === "week") return getWeekUpvotes(portfolio, referenceDate);
  return getAllTimeUpvotes(portfolio);
}

/**
 * Sorts portfolios for the Community Leaderboard based on the selected time horizon:
 * - "today": Ranks by most upvotes for the current day (`todayLikesCount`)
 * - "week": Ranks by most upvotes for that specific week (`weekLikesCount`)
 * - "all": Ranks by overall all-time upvotes (`likesCount`)
 *
 * Tie-breakers are applied consistently (rating, total likes, submission recency).
 */
export function sortLeaderboardItems(
  portfolios: Portfolio[],
  tab: "today" | "week" | "all",
  limit = 5,
  referenceDate?: Date | number
): Portfolio[] {
  if (!portfolios || portfolios.length === 0) return [];
  const pool = [...portfolios];

  if (tab === "today") {
    return pool
      .sort((a, b) => {
        const diff = getTodayUpvotes(b, referenceDate) - getTodayUpvotes(a, referenceDate);
        if (diff !== 0) return diff;
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        const bTime = new Date(b.createdAt).getTime() || 0;
        const aTime = new Date(a.createdAt).getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  if (tab === "week") {
    return pool
      .sort((a, b) => {
        const diff = getWeekUpvotes(b, referenceDate) - getWeekUpvotes(a, referenceDate);
        if (diff !== 0) return diff;
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        const bTime = new Date(b.createdAt).getTime() || 0;
        const aTime = new Date(a.createdAt).getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  return pool
    .sort((a, b) => {
      const diff = getAllTimeUpvotes(b) - getAllTimeUpvotes(a);
      if (diff !== 0) return diff;
      if (b.rating !== a.rating) return b.rating - a.rating;
      const bTime = new Date(b.createdAt).getTime() || 0;
      const aTime = new Date(a.createdAt).getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}
