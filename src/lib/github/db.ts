import { pool } from "@/lib/auth/better-auth";

let tablesInitialized = false;

function logDbError(context: string, err: any) {
  const code = typeof err?.code === "string" ? err.code : "unknown";
  const message = typeof err?.message === "string"
    ? err.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    : "Database query failed";
  console.warn(`[github db] ${context} (${code}): ${message}`);
}

/**
 * Initializes GitHub cache tables if they don't already exist.
 * Runs idempotently in the background.
 */
export async function ensureGithubTablesExist(): Promise<boolean> {
  if (tablesInitialized) return true;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.github_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        github_id BIGINT NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        profile_url TEXT,
        public_repository_count INTEGER NOT NULL DEFAULT 0,
        followers INTEGER NOT NULL DEFAULT 0,
        following INTEGER NOT NULL DEFAULT 0,
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_github_profiles_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS public.github_repositories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        github_repo_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        html_url TEXT NOT NULL,
        homepage TEXT,
        language TEXT,
        topics TEXT[] NOT NULL DEFAULT '{}',
        stars INTEGER NOT NULL DEFAULT 0,
        forks INTEGER NOT NULL DEFAULT 0,
        is_private BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        pushed_at TIMESTAMPTZ,
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_github_repos_user_repo UNIQUE (user_id, github_repo_id)
      );

      CREATE TABLE IF NOT EXISTS public.github_readmes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        repository_id UUID REFERENCES public.github_repositories(id) ON DELETE CASCADE,
        repository_full_name TEXT NOT NULL,
        content_markdown TEXT NOT NULL,
        content_sha TEXT,
        source_url TEXT NOT NULL,
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_github_readmes_user_repo UNIQUE (user_id, repository_full_name)
      );

      CREATE TABLE IF NOT EXISTS public.github_contributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        contribution_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_github_contributions_user_date UNIQUE (user_id, date)
      );

      CREATE TABLE IF NOT EXISTS public.github_contribution_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        total_contributions INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_github_summaries_user_year UNIQUE (user_id, year)
      );
    `);
    tablesInitialized = true;
    return true;
  } catch {
    // If user doesn't have DDL permissions or profiles table is not yet created, fail silently
    return false;
  }
}

/**
 * Safely executes a query, suppressing 42P01 (relation does not exist) errors
 * and attempting auto-creation if appropriate.
 */
export async function safeDbQuery<T = any>(
  queryText: string,
  params: any[] = []
): Promise<{ rows: T[] } | null> {
  try {
    const res = await pool.query(queryText, params);
    return res as any;
  } catch (err: any) {
    if (err?.code === "42P01") {
      // Missing table: try to create once, then retry query
      const created = await ensureGithubTablesExist();
      if (created) {
        try {
          const res = await pool.query(queryText, params);
          return res as any;
        } catch (retryErr) {
          logDbError("query retry failed", retryErr);
          return null;
        }
      }
      return null;
    }
    logDbError("query failed", err);
    return null;
  }
}
