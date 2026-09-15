import { pool } from "@/lib/auth/better-auth";

export interface LinkedGithubAccount {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Retrieves the linked GitHub account for a RateFactor user from PostgreSQL.
 * Tokens are kept strictly server-side and never returned to the client.
 */
export async function getGithubAccount(userId: string): Promise<LinkedGithubAccount | null> {
  if (!userId) return null;

  try {
    const result = await pool.query(
      `SELECT id, "userId", "accountId", "providerId", "accessToken", "refreshToken", "accessTokenExpiresAt", scope
       FROM public."account"
       WHERE ("userId" = $1 OR "userId"::text = $1) AND "providerId" = 'github'
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      accountId: row.accountId,
      providerId: row.providerId,
      accessToken: row.accessToken || undefined,
      refreshToken: row.refreshToken || undefined,
      expiresAt: row.accessTokenExpiresAt ? new Date(row.accessTokenExpiresAt) : undefined,
      scope: row.scope || undefined,
    };
  } catch (error) {
    console.warn("[getGithubAccount] DB lookup error:", error);
    return null;
  }
}

/**
 * Retrieves the OAuth access token for a linked GitHub user.
 */
export async function getGithubAccessToken(userId: string): Promise<string | null> {
  const account = await getGithubAccount(userId);
  return account?.accessToken || null;
}

/**
 * Authenticated server-only GitHub REST fetcher.
 */
export async function githubFetch<T>(
  token?: string | null,
  path: string = "",
  init?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RateFactor-App",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(init?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith("http") ? path : `https://api.github.com${path.startsWith("/") ? "" : "/"}${path}`;
  const response = await fetch(cleanPath, {
    ...init,
    headers,
    ...(token ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`GitHub API error (${response.status}): ${errorBody || response.statusText}`);
  }

  return response.json();
}

/**
 * Authenticated server-only GitHub GraphQL fetcher.
 */
export async function githubGraphQL<T>(
  token: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "RateFactor-App",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`GitHub GraphQL API error (${response.status}): ${errorBody}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(`GitHub GraphQL query error: ${json.errors[0].message}`);
  }

  return json.data;
}
