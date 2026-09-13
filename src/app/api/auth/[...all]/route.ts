import { auth } from "@/lib/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { handleOtpRequest, handleOtpVerify } from "@/lib/auth/otp-handlers";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { canonicalizeEmail, isCanonicalEmailRegistered, registerCanonicalEmail } from "@/lib/auth/email";

const betterAuthHandlers = toNextJsHandler(auth);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest | Request) {
  const url = new URL(req.url);
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

  // 1. OTP Challenge endpoints
  if (url.pathname === "/api/auth/otp/request" || url.pathname.endsWith("/otp/request")) {
    return handleOtpRequest(req as NextRequest);
  }
  if (url.pathname === "/api/auth/otp/verify" || url.pathname.endsWith("/otp/verify")) {
    return handleOtpVerify(req as NextRequest);
  }

  // 2. Sign-Up protection: sliding window rate limit & Gmail alias deduplication
  if (url.pathname.includes("/sign-up")) {
    // Max 3 signups per hour per IP with 15s cooldown debounce
    const rateCheck = checkRateLimit(`account-creation:${ip}`, "ACCOUNT_CREATION");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body && typeof body.email === "string") {
        const canonical = canonicalizeEmail(body.email);
        if (isCanonicalEmailRegistered(canonical)) {
          return NextResponse.json(
            {
              type: "https://ratefactor.dev/errors/email-already-registered",
              title: "Email Mailbox Already Registered",
              status: 409,
              detail: "An account for this primary mailbox already exists. Gmail dot and plus aliases cannot be used to create duplicate accounts.",
            },
            { status: 409 }
          );
        }
      }
    } catch {}
  }

  // 3. Sign-In protection: brute-force / credential stuffing rate limiting
  if (url.pathname.includes("/sign-in")) {
    const rateCheck = checkRateLimit(`signin-attempt:${ip}`, "SIGNIN_ATTEMPT");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  }

  const res = await betterAuthHandlers.POST(req as any);

  // If signup succeeded, register the canonical mailbox
  if (url.pathname.includes("/sign-up") && res.status < 400) {
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body?.email) {
        registerCanonicalEmail(body.email);
      }
    } catch {}
  }

  return res;
}

export async function GET(req: NextRequest | Request) {
  try {
    return await betterAuthHandlers.GET(req as any);
  } catch (error: any) {
    console.error("[Auth API Route GET Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error", stack: error?.stack },
      { status: 500 }
    );
  }
}

export const { PATCH, PUT, DELETE } = betterAuthHandlers;
