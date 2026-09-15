import { githubFetch, getGithubAccessToken } from "./client";

/**
 * PROJECT-level GitHub repository verification (owner / contributor / none).
 *
 * This is intentionally separate from the dashboard GitHub sync/cache
 * (./sync.ts, ./cache.ts): that cache exists to make a user's OWN dashboard
 * display fast and is allowed to be a few minutes stale. Verifying "does
 * this authenticated GitHub identity actually own/contribute to this
 * specific repository" is a trust decision attached to a specific portfolio
 * submission — it must always be derived fresh from the GitHub API using the
 * caller's own linked token, never read from or written into that display
 * cache, and never trust a client-supplied username/login.
 */

export interface ParsedGithubRepo {
  owner: string;
  repo: string;
}

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
// GitHub login: alnum, may contain single hyphens, cannot start/end with one, max 39 chars.
// Validated loosely here (existence-safety, not exhaustive GitHub rules) — good enough to
// reject anything that isn't a plausible path segment before it ever reaches a URL we build.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_RE = /^[A-Za-z0-9._-]+$/;

/**
 * Strictly parses a GitHub repository URL into { owner, repo }.
 *
 * Uses URL() to parse, never substring/regex matching against the raw
 * string. Only accepts exactly two path segments on github.com/www.github.com
 * — repository subpaths (/issues, /tree/..., /pull/...), other GitHub
 * products (gist.github.com), and non-GitHub hosts are all rejected. Never
 * infers owner/repo from anything but the parsed hostname + path.
 */
export function parseGithubRepoUrl(url: string): ParsedGithubRepo | null {
  if (!url || typeof url !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!GITHUB_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  // Query string / fragment are ignored entirely — they never influence parsing.
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");

  if (!owner || !repo) return null;
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;

  return { owner, repo };
}

export type GithubProjectVerificationStatus = "owner" | "contributor" | "none";
export type GithubProjectUnavailableReason = "not_linked" | "invalid_url" | "unavailable" | "private_repo";

export type GithubProjectVerificationResult =
  | {
      status: GithubProjectVerificationStatus;
      githubLogin: string;
      repositoryFullName: string;
      verifiedAt: string;
    }
  | {
      status: null;
      reason: GithubProjectUnavailableReason;
    };

function unavailable(reason: GithubProjectUnavailableReason): GithubProjectVerificationResult {
  return { status: null, reason };
}

/** Extracts the HTTP status githubFetch encoded into its thrown Error message. */
function statusFromError(err: unknown): number | null {
  if (err instanceof Error) {
    const match = /\((\d{3})\)/.exec(err.message);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Any non-2xx/network failure that isn't a clean "not found" is treated as transient. */
function isTransientStatus(status: number | null): boolean {
  if (status === null) return true; // network error / no status parsed
  return status === 403 || status === 429 || status >= 500;
}

interface GithubUserResponse {
  login: string;
}

interface GithubRepoResponse {
  full_name: string;
  private: boolean;
  owner: { login: string };
}

/** Existence-only check: does GitHub attribute at least one commit in this repo to `login`? */
async function hasAttributedCommit(
  token: string,
  owner: string,
  repo: string,
  login: string
): Promise<boolean | "error"> {
  try {
    const commits = await githubFetch<any[]>(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?author=${encodeURIComponent(login)}&per_page=1`
    );
    if (!Array.isArray(commits) || commits.length === 0) return false;
    const first = commits[0];
    // Prefer GitHub's own linked-account attribution over raw commit
    // author name/email text. When GitHub couldn't link the commit to a
    // GitHub account, `author` is null — in that case we still trust the
    // `?author=` server-side filter (GitHub only honors it as a login
    // filter when it resolves to an account), rather than falling back to
    // parsing the free-text commit.author name/email ourselves.
    if (first?.author?.login) {
      return first.author.login.toLowerCase() === login.toLowerCase();
    }
    return true;
  } catch (err) {
    const status = statusFromError(err);
    if (status === 404 || status === 422) return false; // empty/invalid repo history for this filter
    return "error";
  }
}

/** Existence-only check: did `login` author at least one MERGED pull request in this repo? */
async function hasMergedAuthoredPullRequest(
  token: string,
  owner: string,
  repo: string,
  login: string
): Promise<boolean | "error"> {
  try {
    const query = `repo:${owner}/${repo} type:pr is:merged author:${login}`;
    const result = await githubFetch<{ total_count: number }>(
      token,
      `/search/issues?q=${encodeURIComponent(query)}&per_page=1`
    );
    return (result?.total_count || 0) > 0;
  } catch {
    return "error";
  }
}

/**
 * Runs the full owner -> contributor verification flow for the authenticated
 * Better Auth user's linked GitHub account against a submitted repository
 * URL. Never persists anything — callers decide what (if anything) to store.
 */
export async function verifyGithubProjectRelationship(
  betterAuthUserId: string | null,
  githubUrl: string
): Promise<GithubProjectVerificationResult> {
  const parsed = parseGithubRepoUrl(githubUrl);
  if (!parsed) return unavailable("invalid_url");

  if (!betterAuthUserId) return unavailable("not_linked");

  const token = await getGithubAccessToken(betterAuthUserId).catch(() => null);
  if (!token) return unavailable("not_linked");

  // 1. Resolve the authenticated GitHub identity fresh from the token —
  // never from a cached dashboard username, RateFactor username, or any
  // client-supplied value.
  let authenticatedLogin: string;
  try {
    const me = await githubFetch<GithubUserResponse>(token, "/user");
    if (!me?.login) return unavailable("unavailable");
    authenticatedLogin = me.login;
  } catch (err) {
    const status = statusFromError(err);
    if (status === 401) return unavailable("not_linked"); // token revoked/expired
    return unavailable("unavailable");
  }

  // 2. Fetch and validate the repository itself.
  let repoData: GithubRepoResponse;
  try {
    repoData = await githubFetch<GithubRepoResponse>(
      token,
      `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`
    );
  } catch (err) {
    const status = statusFromError(err);
    if (status === 404) return unavailable("private_repo"); // nonexistent and private are indistinguishable by design
    if (isTransientStatus(status)) return unavailable("unavailable");
    return unavailable("unavailable");
  }

  if (!repoData || repoData.private !== false) {
    // v1 only verifies public repositories; never expose private repo metadata.
    return unavailable("private_repo");
  }

  const repositoryFullName = repoData.full_name;
  const verifiedAt = new Date().toISOString();

  // For a renamed/transferred repository, repoData (and its full_name/owner)
  // is the CANONICAL identity GitHub redirected us to — it can differ from
  // the owner/repo the caller originally submitted. The REST commits
  // endpoint transparently follows that redirect, but the Search API's
  // `repo:` qualifier does not and 422s on a stale name. Use the canonical
  // owner/repo (derived from repoData, not the raw parsed input) for every
  // subsequent call so both checks target the same repository the owner
  // check just validated.
  const [canonicalOwner, canonicalRepo] = repositoryFullName.split("/");

  // 3. Owner check — organization repos never make a member the "owner"
  // merely by membership, since repoData.owner.login is the org's own
  // login, not any individual member's.
  if (authenticatedLogin.toLowerCase() === repoData.owner.login.toLowerCase()) {
    return { status: "owner", githubLogin: authenticatedLogin, repositoryFullName, verifiedAt };
  }

  // 4. Contributor check — commit attribution first, merged-PR fallback.
  const commitResult = await hasAttributedCommit(token, canonicalOwner, canonicalRepo, authenticatedLogin);
  if (commitResult === "error") return unavailable("unavailable");
  if (commitResult === true) {
    return { status: "contributor", githubLogin: authenticatedLogin, repositoryFullName, verifiedAt };
  }

  const prResult = await hasMergedAuthoredPullRequest(token, canonicalOwner, canonicalRepo, authenticatedLogin);
  if (prResult === "error") return unavailable("unavailable");
  if (prResult === true) {
    return { status: "contributor", githubLogin: authenticatedLogin, repositoryFullName, verifiedAt };
  }

  return { status: "none", githubLogin: authenticatedLogin, repositoryFullName, verifiedAt };
}
