import { NextRequest, NextResponse } from "next/server";
import { otpRequestSchema, otpVerifySchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { createOTPChallenge, verifyOTPChallenge } from "@/lib/auth/otp";
import { normalizeUsername } from "@/lib/auth/client";
import { canonicalizeEmail, registerCanonicalEmail, isCanonicalEmailRegistered } from "@/lib/auth/email";
import { sendOtpEmail } from "@/lib/email/sender";
import { auth } from "@/lib/auth/better-auth";

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

    const { email, provider, name, password, purpose } = parseResult.data;
    const canonical = canonicalizeEmail(email);

    // 1. If registering a new account, prevent duplicate email aliases
    if (purpose === "signup" && isCanonicalEmailRegistered(canonical)) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/email-already-registered",
          title: "Email Already Registered",
          status: 409,
          detail: "An account with this email address already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // 2. Sliding window rate limitation: Max 3 OTP requests per 10 minutes per IP/canonical email
    const rateCheck = checkRateLimit(`otp-req:${canonical}:${ip}`, "OTP_REQUEST");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    // 3. Generate challenge and cryptographically secure 6-digit OTP (Strictly 5-minute expiry)
    const { challengeId, rawCode, expiresAt } = createOTPChallenge(email, provider, {
      name,
      password,
      purpose,
    });

    // 4. Send email directly via Resend to the recipient
    const emailResult = await sendOtpEmail({
      to: email,
      code: rawCode,
      name,
      expiresInMinutes: 5,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/email-dispatch-failed",
          title: "Email Dispatch Failed",
          status: 500,
          detail: emailResult.error || "Failed to deliver verification code to your email. Please verify your email address.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `A 6-digit one-time verification code has been dispatched to ${email}.`,
        challengeId,
        expiresAt,
        expiresInSeconds: 300,
        provider,
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

    // Sliding window check on verification attempts per IP
    const rateCheck = checkRateLimit(`otp-verify:${ip}`, { limit: 10, windowSeconds: 300, debounceSeconds: 1 });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    // Verify OTP against stored challenge (checks 5-minute expiry, attempts < 5, SHA-256 hash)
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

    let createdUserId = challenge.userId || `user_${username}_${Date.now()}`;

    // Auto-create user in Better Auth if signing up with password
    if (challenge.purpose === "signup" && challenge.password) {
      try {
        const signupRes = await auth.api.signUpEmail({
          body: {
            email: challenge.email,
            password: challenge.password,
            name: challenge.name || challenge.email.split("@")[0],
          },
        });
        if (signupRes?.user) {
          createdUserId = signupRes.user.id;
        }
      } catch (signupErr: any) {
        // If user already exists or pool is simulated, continue with resilient verified profile
        console.warn("[OTP Verify / Better Auth Auto-Signup]:", signupErr?.message || signupErr);
      }
    }

    const user = {
      id: createdUserId,
      email: challenge.email,
      username,
      name: challenge.name || username.charAt(0).toUpperCase() + username.slice(1),
      role: "developer",
      isVerified: true,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    };

    return NextResponse.json(
      {
        message: "Email verification successful. Welcome to RateFactor!",
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
