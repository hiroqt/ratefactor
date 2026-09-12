import { pool } from "@/lib/auth/better-auth";
import { githubGraphQL } from "./client";

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

function generateEmptyHeatmap(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  for (let i = 139; i >= 0; i--) {
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
 * Fetches contribution activity calendar from GitHub (GraphQL with REST/Scraper fallback).
 */
export async function fetchGithubContributions(
  token?: string | null,
  fallbackUsername?: string
): Promise<GithubContributionsData> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");

  let days: ActivityDay[] = [];
  let totalContributions = 0;

  // 1. Try Authenticated GraphQL viewer.contributionsCollection
  if (token) {
    try {
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - 140);

      const query = `
        query Contributions($from: DateTime!, $to: DateTime!) {
          viewer {
            login
            contributionsCollection(from: $from, to: $to) {
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

      const gqlData: any = await githubGraphQL(token, query, {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      });

      const cal = gqlData?.viewer?.contributionsCollection?.contributionCalendar;
      if (cal && Array.isArray(cal.weeks)) {
        totalContributions = cal.totalContributions || 0;
        const rawDays: ActivityDay[] = [];
        for (const w of cal.weeks) {
          if (Array.isArray(w.contributionDays)) {
            for (const d of w.contributionDays) {
              let level: 0 | 1 | 2 | 3 | 4 = 0;
              if (d.contributionLevel === "FIRST_QUARTILE") level = 1;
              else if (d.contributionLevel === "SECOND_QUARTILE") level = 2;
              else if (d.contributionLevel === "THIRD_QUARTILE") level = 3;
              else if (d.contributionLevel === "FOURTH_QUARTILE") level = 4;
              else if (d.contributionCount > 0) level = 1;

              rawDays.push({
                date: d.date,
                count: d.contributionCount || 0,
                level,
              });
            }
          }
        }
        if (rawDays.length > 0) {
          days = rawDays.slice(-140);
        }
      }
    } catch (err) {
      console.warn("[fetchGithubContributions] GraphQL failed, falling back:", err);
    }
  }

  // 2. Fallback: Public API or scrape
  if (days.length === 0 && targetUsername) {
    try {
      const contribRes = await fetch(
        `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(targetUsername)}?y=last`,
        { headers: { "User-Agent": "RateFactor-App" }, next: { revalidate: 300 } }
      );

      if (contribRes.ok) {
        const data = await contribRes.json();
        const rawDays = data.contributions || [];
        days = rawDays.slice(-140).map((d: any) => ({
          date: d.date,
          count: d.count || 0,
          level: Math.min(Math.max(d.level || 0, 0), 4) as 0 | 1 | 2 | 3 | 4,
        }));
        totalContributions = data.total?.lastYear || rawDays.reduce((acc: number, d: any) => acc + (d.count || 0), 0);
      }
    } catch {}

    if (days.length === 0) {
      try {
        const htmlRes = await fetch(
          `https://github.com/users/${encodeURIComponent(targetUsername)}/contributions`,
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
            days = parsed.slice(-140);
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

  return {
    username: targetUsername || "developer",
    totalContributions,
    currentStreak,
    longestStreak,
    days,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Saves and caches contributions in PostgreSQL.
 */
export async function saveGithubContributions(
  userId: string,
  data: GithubContributionsData
): Promise<void> {
  if (!userId || data.days.length === 0) return;

  try {
    const currentYear = new Date().getFullYear();

    // 1. Save summary
    await pool.query(
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

    // 2. Batch upsert daily counts
    for (const d of data.days) {
      await pool.query(
        `INSERT INTO public.github_contributions (user_id, date, contribution_count, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, date) DO UPDATE SET
           contribution_count = EXCLUDED.contribution_count,
           updated_at = NOW()`,
        [userId, d.date, d.count]
      );
    }
  } catch (err) {
    console.warn("[saveGithubContributions] DB error:", err);
  }
}

/**
 * Retrieves cached contributions from PostgreSQL.
 */
export async function getCachedGithubContributions(
  userId: string
): Promise<GithubContributionsData | null> {
  if (!userId) return null;

  try {
    const summaryRes = await pool.query(
      `SELECT * FROM public.github_contribution_summaries
       WHERE user_id = $1
       ORDER BY year DESC
       LIMIT 1`,
      [userId]
    );

    const daysRes = await pool.query(
      `SELECT date::text, contribution_count FROM public.github_contributions
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 140`,
      [userId]
    );

    if (daysRes.rows.length === 0) return null;

    const days: ActivityDay[] = daysRes.rows.reverse().map((r) => {
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

    const summary = summaryRes.rows[0];
    const { currentStreak, longestStreak } = computeStreaks(days);

    return {
      username: "developer",
      totalContributions: summary ? Number(summary.total_contributions) : days.reduce((a, d) => a + d.count, 0),
      currentStreak: summary ? Number(summary.current_streak) : currentStreak,
      longestStreak: summary ? Number(summary.longest_streak) : longestStreak,
      days,
      lastSyncedAt: summary?.last_synced_at ? new Date(summary.last_synced_at).toISOString() : undefined,
    };
  } catch {
    return null;
  }
}
