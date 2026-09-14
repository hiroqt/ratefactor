export type AppRole =
  | "guest"
  | "user"
  | "developer"
  | "frontend"
  | "backend"
  | "fullstack"
  | "ui/ux"
  | "qa"
  | "ml"
  | "cloud"
  | "network"
  | "data"
  | "graphics"
  | "moderator"
  | "admin"
  | string;

export interface UserSessionContext {
  id: string;
  email?: string;
  username: string;
  role: AppRole;
  isVerified?: boolean;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  guest: 0,
  Guest: 0,
  user: 1,
  User: 1,
  developer: 1,
  Developer: 1,
  frontend: 1,
  "front end": 1,
  "Front End": 1,
  backend: 1,
  Backend: 1,
  fullstack: 1,
  Fullstack: 1,
  "ui/ux": 1,
  "UI/UX": 1,
  qa: 1,
  QA: 1,
  ml: 1,
  ML: 1,
  cloud: 1,
  Cloud: 1,
  network: 1,
  Network: 1,
  data: 1,
  Data: 1,
  graphics: 1,
  Graphics: 1,
  moderator: 2,
  Moderator: 2,
  admin: 3,
  Admin: 3,
};

/**
 * Checks if a user's role satisfies the minimum required role level.
 * Any authenticated role (including 'user' and discipline roles) has level 1.
 */
export function hasRole(currentRole: AppRole | undefined, requiredRole: AppRole): boolean {
  const normCurrent = (currentRole || "guest").toLowerCase().trim();
  const normRequired = (requiredRole || "guest").toLowerCase().trim();
  const userLevel = ROLE_HIERARCHY[normCurrent] ?? (normCurrent === "guest" ? 0 : 1);
  const requiredLevel = ROLE_HIERARCHY[normRequired] ?? (normRequired === "guest" ? 0 : 1);
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

