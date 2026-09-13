export type AppRole = "guest" | "developer" | "moderator" | "admin";

export interface UserSessionContext {
  id: string;
  email?: string;
  username: string;
  role: AppRole;
  isVerified?: boolean;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  guest: 0,
  developer: 1,
  moderator: 2,
  admin: 3,
};

/**
 * Checks if a user's role satisfies the minimum required role
 */
export function hasRole(currentRole: AppRole | undefined, requiredRole: AppRole): boolean {
  const userLevel = ROLE_HIERARCHY[currentRole || "guest"] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Validates whether the role can perform administrative/moderation actions
 */
export function isModerator(role: AppRole | undefined): boolean {
  return hasRole(role, "moderator");
}

export function isAdmin(role: AppRole | undefined): boolean {
  return hasRole(role, "admin");
}

/**
 * Standard RFC 7807 problem details error format
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export function createForbiddenError(detail = "Insufficient permissions to perform this action."): ProblemDetails {
  return {
    type: "https://ratefactor.dev/errors/forbidden",
    title: "Forbidden",
    status: 403,
    detail,
  };
}

export function createUnauthorizedError(detail = "Authentication required to perform this action."): ProblemDetails {
  return {
    type: "https://ratefactor.dev/errors/unauthorized",
    title: "Unauthorized",
    status: 401,
    detail,
  };
}

export function checkAdminAccess(user: { role?: AppRole } | null | undefined): {
  authorized: boolean;
  error?: ProblemDetails;
} {
  if (!user) {
    return {
      authorized: false,
      error: createUnauthorizedError("Sign in as an administrator to access this resource."),
    };
  }
  if (!isAdmin(user.role)) {
    return {
      authorized: false,
      error: createForbiddenError("Administrative privileges required for this action."),
    };
  }
  return { authorized: true };
}

export function checkModeratorAccess(user: { role?: AppRole } | null | undefined): {
  authorized: boolean;
  error?: ProblemDetails;
} {
  if (!user) {
    return {
      authorized: false,
      error: createUnauthorizedError("Sign in to access this moderation resource."),
    };
  }
  if (!isModerator(user.role)) {
    return {
      authorized: false,
      error: createForbiddenError("Moderator privileges required for this action."),
    };
  }
  return { authorized: true };
}

