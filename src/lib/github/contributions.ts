import { githubGraphQL } from "./client";
import { githubCache, CACHE_TTL } from "./cache";

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
  const cacheKey = token ? null : targetUsername ? `contributions:${targetUsername.toLowerCase()}` : null;

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
