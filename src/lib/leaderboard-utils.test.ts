import assert from "node:assert/strict";
import test from "node:test";
import type { Portfolio } from "../types/portfolio";
import {
  getTodayUpvotes,
  getWeekUpvotes,
  getAllTimeUpvotes,
  getDisplayUpvotes,
  sortLeaderboardItems,
  getStartOfTodayUtc,
  getStartOfWeekUtc,
  isWithinCurrentDay,
  isWithinCurrentWeek,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./leaderboard-utils.ts";

function createMockPortfolio(partial: Partial<Portfolio>): Portfolio {
  return {
    id: partial.id || "p1",
    title: partial.title || "Portfolio 1",
    tagline: partial.tagline || "Tagline for developer",
    description: partial.description || "Description",
    domains: partial.domains || [],
    portfolioUrl: partial.portfolioUrl || "https://example.com",
    githubUrl: partial.githubUrl || "https://github.com/example/repo",
    thumbnail: partial.thumbnail || "https://example.com/thumb.png",
    category: partial.category || "Frontend",
    techStack: partial.techStack || ["React", "TypeScript"],
    rating: partial.rating ?? 4.5,
    ratingCount: partial.ratingCount ?? 10,
    ratingBreakdown: partial.ratingBreakdown || {
      design: 4.5,
      codeQuality: 4.5,
      performance: 4.5,
      documentation: 4.5,
    },
    likesCount: partial.likesCount ?? 0,
    todayLikesCount: partial.todayLikesCount,
    weekLikesCount: partial.weekLikesCount,
    commentsCount: partial.commentsCount ?? 0,
    comments: [],
    createdAt: partial.createdAt || new Date().toISOString(),
    author: partial.author || {
      name: "Test Dev",
      username: "testdev",
      avatar: "https://example.com/avatar.png",
      role: "developer",
    },
    ...partial,
  };
}

test("getTodayUpvotes prefers explicit todayLikesCount", () => {
  const p = createMockPortfolio({
    likesCount: 100,
    todayLikesCount: 15,
    createdAt: "2025-01-01T00:00:00.000Z",
  });
  assert.equal(getTodayUpvotes(p), 15);
});

test("getTodayUpvotes falls back to likesCount if created today and todayLikesCount undefined", () => {
  const refDate = new Date("2026-09-16T12:00:00.000Z");
  const pCreatedToday = createMockPortfolio({
    likesCount: 5,
    createdAt: "2026-09-16T08:00:00.000Z",
  });
  const pCreatedYesterday = createMockPortfolio({
    likesCount: 5,
    createdAt: "2026-09-15T08:00:00.000Z",
  });

  assert.equal(getTodayUpvotes(pCreatedToday, refDate), 5);
  assert.equal(getTodayUpvotes(pCreatedYesterday, refDate), 0);
});

test("getWeekUpvotes prefers explicit weekLikesCount", () => {
  const p = createMockPortfolio({
    likesCount: 100,
    weekLikesCount: 42,
    createdAt: "2025-01-01T00:00:00.000Z",
  });
  assert.equal(getWeekUpvotes(p), 42);
});

test("getWeekUpvotes falls back to likesCount if created this week and weekLikesCount undefined", () => {
  // 2026-09-16 is a Wednesday. ISO week starts Monday 2026-09-14.
  const refDate = new Date("2026-09-16T12:00:00.000Z");
  const pCreatedThisWeek = createMockPortfolio({
    likesCount: 8,
    createdAt: "2026-09-15T08:00:00.000Z",
  });
  const pCreatedLastWeek = createMockPortfolio({
    likesCount: 8,
    createdAt: "2026-09-10T08:00:00.000Z",
  });

  assert.equal(getWeekUpvotes(pCreatedThisWeek, refDate), 8);
  assert.equal(getWeekUpvotes(pCreatedLastWeek, refDate), 0);
});

test("getDisplayUpvotes returns correct count for each tab", () => {
  const p = createMockPortfolio({
    likesCount: 200,
    weekLikesCount: 30,
    todayLikesCount: 7,
  });

  assert.equal(getDisplayUpvotes(p, "today"), 7);
  assert.equal(getDisplayUpvotes(p, "week"), 30);
  assert.equal(getDisplayUpvotes(p, "all"), 200);
});

test("sortLeaderboardItems ranks by most upvotes today in 'today' tab", () => {
  const pA = createMockPortfolio({ id: "A", title: "Project A", todayLikesCount: 10, likesCount: 50 });
  const pB = createMockPortfolio({ id: "B", title: "Project B", todayLikesCount: 25, likesCount: 30 });
  const pC = createMockPortfolio({ id: "C", title: "Project C", todayLikesCount: 2, likesCount: 100 });

  const sorted = sortLeaderboardItems([pA, pB, pC], "today");
  assert.equal(sorted[0].id, "B"); // 25 today upvotes
  assert.equal(sorted[1].id, "A"); // 10 today upvotes
  assert.equal(sorted[2].id, "C"); // 2 today upvotes
});

test("sortLeaderboardItems ranks by weekly total upvotes in 'week' tab", () => {
  const pA = createMockPortfolio({ id: "A", title: "Project A", weekLikesCount: 15, likesCount: 80 });
  const pB = createMockPortfolio({ id: "B", title: "Project B", weekLikesCount: 45, likesCount: 60 });
  const pC = createMockPortfolio({ id: "C", title: "Project C", weekLikesCount: 5, likesCount: 200 });

  const sorted = sortLeaderboardItems([pA, pB, pC], "week");
  assert.equal(sorted[0].id, "B"); // 45 weekly upvotes
  assert.equal(sorted[1].id, "A"); // 15 weekly upvotes
  assert.equal(sorted[2].id, "C"); // 5 weekly upvotes
});

test("sortLeaderboardItems ranks by overall all-time upvotes in 'all' tab", () => {
  const pA = createMockPortfolio({ id: "A", title: "Project A", todayLikesCount: 50, likesCount: 120 });
  const pB = createMockPortfolio({ id: "B", title: "Project B", todayLikesCount: 10, likesCount: 300 });
  const pC = createMockPortfolio({ id: "C", title: "Project C", todayLikesCount: 5, likesCount: 75 });

  const sorted = sortLeaderboardItems([pA, pB, pC], "all");
  assert.equal(sorted[0].id, "B"); // 300 all-time upvotes
  assert.equal(sorted[1].id, "A"); // 120 all-time upvotes
  assert.equal(sorted[2].id, "C"); // 75 all-time upvotes
});

test("sortLeaderboardItems breaks ties gracefully", () => {
  // Two items with same today upvotes (0)
  const pHighRating = createMockPortfolio({ id: "high", title: "High Rating", todayLikesCount: 0, rating: 4.9, likesCount: 20 });
  const pLowRating = createMockPortfolio({ id: "low", title: "Low Rating", todayLikesCount: 0, rating: 4.2, likesCount: 20 });

  const sorted = sortLeaderboardItems([pLowRating, pHighRating], "today");
  assert.equal(sorted[0].id, "high");
  assert.equal(sorted[1].id, "low");
});
