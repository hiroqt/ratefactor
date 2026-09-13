import { NextRequest } from "next/server";
import { auth } from "./better-auth";
import { normalizeUsername } from "./client";
import { AppRole } from "./rbac";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email?: string;
  username: string;
  role: AppRole;
  avatar?: string;
}

/**
 * Resolves the authenticated user from Better Auth session cookies or authorization headers.
 * Safe against offline database in local development.
 */
export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Better Auth session resolution via cookie/headers
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user) {
      const u = session.user;
      return {
        id: u.id,
        name: u.name || "Developer",
        email: u.email || undefined,
        username: normalizeUsername(u.email || u.name),
        role: ((u as any).role as AppRole) || "developer",
        avatar: u.image || undefined,
      };
    }
  } catch {
    // Database offline or unconfigured in dev; fallback to header credentials
  }

  // 2. Fallback to custom x-user-id header (strictly for dev & test scripts)
  if (process.env.NODE_ENV !== "production") {
    const userId = req.headers.get("x-user-id");
    if (userId) {
      return {
        id: userId,
        name: "Developer",
        email: `${userId}@ratefactor.dev`,
        username: normalizeUsername(userId),
        role: "developer",
      };
    }

    // 3. Fallback to Bearer token header in dev/test
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
