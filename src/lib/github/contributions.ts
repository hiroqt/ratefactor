import { pool } from "@/lib/auth/better-auth";
import { githubGraphQL } from "./client";
import { githubCache, CACHE_TTL } from "./cache";
import { safeDbQuery } from "./db";

export interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface GithubContributionsData {
  username: string;
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  days: ActivityDay[];
  lastSyncedAt?: string;
}

/**
 * Generates empty placeholder days for the whole year (53 weeks = 371 days).
 */
export function generateEmptyHeatmap(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  for (let i = 370; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      count: 0,
      level: 0,
    });
  }
  return days;
}

function computeStreaks(days: ActivityDay[]): { currentStreak: number; longestStreak: number } {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const day of days) {
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

function parseGitHubContributionsHtml(html: string): ActivityDay[] {
  const days: ActivityDay[] = [];
  const cellRegex =
    /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"[^>]*>(?:<tool-tip[^>]*>([0-9,]+|\w+)\s+contribution[^<]*<\/tool-tip>)?/gi;

  let match;
  while ((match = cellRegex.exec(html)) !== null) {
    const date = match[1];
    const level = parseInt(match[2], 10) || 0;
    const rawCountStr = match[3] || "0";
    const count = rawCountStr.toLowerCase().includes("no")
      ? 0
      : parseInt(rawCountStr.replace(/,/g, ""), 10) || (level > 0 ? level * 2 : 0);
    days.push({
      date,
      count,
      level: Math.min(Math.max(level, 0), 4) as 0 | 1 | 2 | 3 | 4,
    });
  }

  if (days.length === 0) {
    const rectRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d+)"/gi;
    while ((match = rectRegex.exec(html)) !== null) {
      const date = match[1];
      const level = parseInt(match[2], 10) || 0;
      days.push({
        date,
        count: level > 0 ? level * 2 : 0,
        level: Math.min(Math.max(level, 0), 4) as 0 | 1 | 2 | 3 | 4,
      });
    }
  }

  return days;
}

/**
 * Fetches whole year contribution activity calendar from GitHub (GraphQL with REST/Scraper fallback),
 * with memory cache support.
 */
export async function fetchGithubContributions(
  token?: string | null,
  fallbackUsername?: string,
  bypassCache = false
): Promise<GithubContributionsData> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");
  // Authenticated self lookups (no target username) bypass the in-memory
  // cache entirely — see the matching comment in profile.ts for why a
  // shared "viewer" slot would leak between users.
  const cacheKey = targetUsername ? `contributions:${targetUsername.toLowerCase()}` : null;

  if (!bypassCache && cacheKey) {
    const cached = githubCache.get<GithubContributionsData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let days: ActivityDay[] = [];
  let totalContributions = 0;

  // 1. GraphQL API Query
  const graphqlQuery = targetUsername
    ? `
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  contributionLevel
                }
              }
            }
          }
        }
      }
    `
    : `
      query {
        viewer {
          login
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  contributionLevel
                }
              }
            }
          }
        }
      }
    `;

  if (token) {
    try {
      const variables = targetUsername ? { login: targetUsername } : {};
      const data: any = await githubGraphQL(token, graphqlQuery, variables);
      const calendar = targetUsername
        ? data?.user?.contributionsCollection?.contributionCalendar
        : data?.viewer?.contributionsCollection?.contributionCalendar;

      if (calendar && Array.isArray(calendar.weeks)) {
        totalContributions = calendar.totalContributions || 0;
        const allDays: ActivityDay[] = [];

        for (const week of calendar.weeks) {
          if (Array.isArray(week.contributionDays)) {
            for (const d of week.contributionDays) {
              let level: 0 | 1 | 2 | 3 | 4 = 0;
              switch (d.contributionLevel) {
                case "FOURTH_QUARTILE":
                  level = 4;
                  break;
                case "THIRD_QUARTILE":
                  level = 3;
                  break;
                case "SECOND_QUARTILE":
                  level = 2;
                  break;
                case "FIRST_QUARTILE":
                  level = 1;
                  break;
                default:
                  level = 0;
              }
              allDays.push({
                date: d.date,
                count: d.contributionCount || 0,
                level,
              });
            }
          }
        }

        // Take full year of activity (up to 371 days = 53 weeks)
        days = allDays.length > 371 ? allDays.slice(-371) : allDays;
      }
    } catch {
      // Fallback
    }
  }

  // An authenticated self lookup (no target username) has no scraping
  // fallback available — a failed/empty GraphQL result here means the fetch
  // genuinely failed, not that the viewer has zero contributions (a real
  // zero-contribution year still returns a populated `weeks` calendar).
  // Propagate the failure instead of silently falling through to a
  // fabricated all-zero heatmap.
  if (!targetUsername && token && days.length === 0) {
    throw new Error("Failed to fetch authenticated GitHub contributions.");
  }

  // 2. Fallback to GitHub SVG/HTML scraping endpoint if GraphQL failed
  if (days.length === 0 && targetUsername) {
    try {
      const calendarRes = await fetch(
        `https://github.com/users/${encodeURIComponent(targetUsername)}/contributions`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          next: { revalidate: 300 },
        }
      );

      if (calendarRes.ok) {
        const html = await calendarRes.text();
        const parsed = parseGitHubContributionsHtml(html);
        if (parsed.length > 0) {
          days = parsed.length > 371 ? parsed.slice(-371) : parsed;
          totalContributions = days.reduce((acc, d) => acc + d.count, 0);
        }
      }
    } catch {
      // Ignore
    }

    if (days.length === 0) {
      try {
        const htmlRes = await fetch(
          `https://github.com/${encodeURIComponent(targetUsername)}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            next: { revalidate: 300 },
          }
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const parsed = parseGitHubContributionsHtml(html);
          if (parsed.length > 0) {
            days = parsed.length > 371 ? parsed.slice(-371) : parsed;
            totalContributions = days.reduce((acc, d) => acc + d.count, 0);
          }
        }
      } catch {}
    }
  }

  if (days.length === 0) {
    days = generateEmptyHeatmap();
  }

  const { currentStreak, longestStreak } = computeStreaks(days);

  const result: GithubContributionsData = {
    username: targetUsername || "developer",
    totalContributions,
    currentStreak,
    longestStreak,
    days,
    lastSyncedAt: new Date().toISOString(),
  };

  if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.CONTRIBUTIONS);
  return result;
}

/**
 * Saves and caches contributions in PostgreSQL safely.
 * `userId` must be the canonical public.profiles UUID (see
 * resolveCanonicalProfileId in src/lib/auth/profile-id.ts), not the Better
 * Auth TEXT user id.
 *
 * Returns whether the summary row and every daily row were successfully
 * written, so callers can distinguish a real persistence failure from
 * success instead of assuming success just because fresh data was fetched.
 */
export async function saveGithubContributions(
  userId: string,
  data: GithubContributionsData
): Promise<boolean> {
  if (!userId || data.days.length === 0) return false;

  const currentYear = new Date().getFullYear();
  let allSucceeded = true;

  // 1. Save summary
  const summaryRes = await safeDbQuery(
    `INSERT INTO public.github_contribution_summaries (
      user_id, year, total_contributions, current_streak, longest_streak, last_synced_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (user_id, year) DO UPDATE SET
      total_contributions = EXCLUDED.total_contributions,
      current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_synced_at = NOW(),
      updated_at = NOW()`,
    [
      userId,
      currentYear,
      data.totalContributions,
      data.currentStreak,
      data.longestStreak,
    ]
  );
  if (summaryRes === null) allSucceeded = false;

  // 2. Batch upsert daily counts
  for (const d of data.days) {
    const dayRes = await safeDbQuery(
      `INSERT INTO public.github_contributions (user_id, date, contribution_count, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, date) DO UPDATE SET
         contribution_count = EXCLUDED.contribution_count,
         updated_at = NOW()`,
      [userId, d.date, d.count]
    );
    if (dayRes === null) allSucceeded = false;
  }

  return allSucceeded;
}

/**
 * Retrieves cached contributions from PostgreSQL for the whole year.
 */
export async function getCachedGithubContributions(
  userId: string
): Promise<GithubContributionsData | null> {
  if (!userId) return null;

  const summaryRes = await safeDbQuery(
    `SELECT * FROM public.github_contribution_summaries
     WHERE user_id = $1
     ORDER BY year DESC
     LIMIT 1`,
    [userId]
  );

  const daysRes = await safeDbQuery(
    `SELECT date::text, contribution_count FROM public.github_contributions
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT 371`,
    [userId]
  );

  if (!daysRes || !daysRes.rows || daysRes.rows.length === 0) return null;

  const days: ActivityDay[] = daysRes.rows.reverse().map((r: any) => {
    const count = Number(r.contribution_count) || 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 8) level = 4;
    else if (count > 5) level = 3;
    else if (count > 2) level = 2;
    else if (count > 0) level = 1;

    return {
      date: r.date,
      count,
      level,
    };
  });

  const summary = summaryRes?.rows?.[0];
  const { currentStreak, longestStreak } = computeStreaks(days);

  return {
    username: "developer",
    totalContributions: summary ? Number(summary.total_contributions) : days.reduce((a, d) => a + d.count, 0),
    currentStreak: summary ? Number(summary.current_streak) : currentStreak,
    longestStreak: summary ? Number(summary.longest_streak) : longestStreak,
    days,
    lastSyncedAt: summary?.last_synced_at ? new Date(summary.last_synced_at).toISOString() : undefined,
  };
}
