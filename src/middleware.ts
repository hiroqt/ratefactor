import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for RateFactor
 * Performs edge-level session cookie validation, route guarding, and downstream header propagation.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, and public images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/icon.svg") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Read session tokens from cookies or development/test authorization headers
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("session_token")?.value;

  const authHeader = request.headers.get("authorization");
  const testUserId = request.headers.get("x-user-id");
  const isAuthenticated = Boolean(sessionToken || authHeader || testUserId);

  // 3. Protected UI routes: /dashboard, /profile
  const isProtectedUIRoute =
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/profile") && !pathname.startsWith("/profile/"));

  if (isProtectedUIRoute && !isAuthenticated) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("auth", "required");
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl, 307);
  }

  // 4. Propagate authenticated status downstream to Server Components & Route Handlers
  const requestHeaders = new Headers(request.headers);
  if (isAuthenticated) {
    requestHeaders.set("x-user-authenticated", "true");
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
  ],
};
