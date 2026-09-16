import { NextRequest } from "next/server";
import { auth } from "./better-auth";
import { normalizeUsername } from "./username";
import { AppRole } from "./rbac";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email?: string;
  username: string;
  role: AppRole;
  avatar?: string;
  createdAt?: string;
}

import { pool } from "./better-auth";

/**
 * Resolves the authenticated user from Better Auth session cookies, database sessions, or authorization headers.
 * Safe against offline database in local development.
 */
export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Better Auth session resolution via cookie/headers
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      const u = session.user;
      const createdAt = (u as any).createdAt
        ? new Date((u as any).createdAt).toISOString()
        : undefined;
      return {
        id: u.id,
        name: u.name || "Developer",
        email: u.email || undefined,
        username: normalizeUsername(u.email || u.name),
        role: ((u as any).role as AppRole) || "developer",
        avatar: u.image || undefined,
        createdAt,
      };
    }
  } catch {
    // Database offline or unconfigured in dev; fallback to direct session/header credentials
  }

  // 2. Direct session lookup from database if cookie is present
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/(?:better-auth\.session_token|session_token)=([^;]+)/);
    if (sessionMatch) {
      const rawToken = decodeURIComponent(sessionMatch[1].trim()).split(".")[0];
      const dbRes = await pool.query(
        `SELECT s.id, s."userId", u.name, u.email, u.image, u.role, u."createdAt"
         FROM public.session s
         JOIN public."user" u ON s."userId" = u.id
         WHERE s.token = $1 AND s."expiresAt" > NOW()
         LIMIT 1`,
        [rawToken]
      );
      if (dbRes.rows && dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        return {
          id: row.userId,
          name: row.name || "Developer",
          email: row.email || undefined,
          username: normalizeUsername(row.email || row.name),
          role: (row.role as AppRole) || "developer",
          avatar: row.image || undefined,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        };
      }
    }
  } catch {}

  // 3. Fallback to custom x-user-id header verified against database
  const userId = req.headers.get("x-user-id");
  if (userId) {
    try {
      const userRes = await pool.query(
        `SELECT id, name, email, image, role, "createdAt" FROM public."user" WHERE id = $1 LIMIT 1`,
        [userId]
      );
      if (userRes.rows && userRes.rows.length > 0) {
        const u = userRes.rows[0];
        return {
          id: u.id,
          name: u.name || "Developer",
          email: u.email || undefined,
          username: normalizeUsername(u.email || u.name),
          role: (u.role as AppRole) || "developer",
          avatar: u.image || undefined,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
        };
      }

      // Check profiles table as well
      const profileRes = await pool.query(
        `SELECT id, full_name, username, avatar_url, role, created_at FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($1) LIMIT 1`,
        [userId]
      );
      if (profileRes.rows && profileRes.rows.length > 0) {
        const p = profileRes.rows[0];
        return {
          id: p.id,
          name: p.full_name || "Developer",
          username: p.username || normalizeUsername(userId),
          role: (p.role as AppRole) || "developer",
          avatar: p.avatar_url || undefined,
          createdAt: p.created_at ? new Date(p.created_at).toISOString() : undefined,
        };
      }
    } catch {}

    // Development fallback
    if (process.env.NODE_ENV !== "production") {
      return {
        id: userId,
        name: req.headers.get("x-user-name") || "Developer",
        email: `${userId}@ratefactor.dev`,
        username: req.headers.get("x-user-username") || normalizeUsername(userId),
        role: "developer",
      };
    }
  }

  // 4. Fallback to Bearer token header in dev/test
  if (process.env.NODE_ENV !== "production") {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return {
        id: "bearer_user",
        name: "Developer",
        email: "dev@ratefactor.dev",
        username: "developer",
        role: "developer",
      };
    }
  }

  return null;
}
