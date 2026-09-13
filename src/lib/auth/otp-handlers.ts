import { NextRequest, NextResponse } from "next/server";
import { otpRequestSchema, otpVerifySchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { createOTPChallenge, verifyOTPChallenge } from "@/lib/auth/otp";
import { normalizeUsername } from "@/lib/auth/client";
import { canonicalizeEmail, registerCanonicalEmail } from "@/lib/auth/email";

export async function handleOtpRequest(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();

    const parseResult = otpRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid Request",
          status: 400,
          detail: "Validation failed for OTP request.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, provider } = parseResult.data;
    const canonical = canonicalizeEmail(email);

    // Rate limitation: Max 3 OTP requests per 10 minutes per IP/canonical email (prevents Gmail +/dot bypass)
    const rateCheck = checkRateLimit(`otp-req:${canonical}:${ip}`, "OTP_REQUEST");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    // Generate challenge and cryptographically secure 6-digit OTP
    const { challengeId, rawCode, expiresAt } = createOTPChallenge(email, provider);

    console.log(`[AUTH OTP DISPATCH] [Provider: ${provider}] To: ${email} -> Code: ${rawCode}`);

    return NextResponse.json(
      {
        message: `A 6-digit one-time verification code has been dispatched to ${email}.`,
        challengeId,
        expiresAt,
        provider,
        demoCode: process.env.NODE_ENV !== "production" ? rawCode : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to initiate OTP challenge.",
      },
      { status: 500 }
    );
  }
}

export async function handleOtpVerify(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();

    const parseResult = otpVerifySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid Verification Submission",
          status: 400,
          detail: "Validation failed for OTP verification.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { challengeId, code } = parseResult.data;

    const rateCheck = checkRateLimit(`otp-verify:${ip}`, { limit: 10, windowSeconds: 300, debounceSeconds: 1 });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const verification = verifyOTPChallenge(challengeId, code);

    if (!verification.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/otp-failed",
          title: "Verification Failed",
          status: 401,
          detail: verification.message,
          remainingAttempts: verification.remainingAttempts,
        },
        { status: 401 }
      );
    }

    const challenge = verification.challenge!;
    registerCanonicalEmail(challenge.email);
    const username = normalizeUsername(challenge.email);

    const user = {
      id: challenge.userId || `user_${username}`,
      email: challenge.email,
      username,
      name: username.charAt(0).toUpperCase() + username.slice(1),
      role: "developer",
      isVerified: true,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    };

    return NextResponse.json(
      {
        message: "OTP verification successful. Welcome to RateFactor!",
        user,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to process OTP verification.",
      },
      { status: 500 }
    );
  }
}
