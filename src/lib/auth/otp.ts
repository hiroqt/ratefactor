import crypto from "crypto";

export interface OTPChallenge {
  id: string;
  userId?: string;
  email: string;
  otpHash: string;
  provider: "google" | "email_password";
  attempts: number;
  maxAttempts: number;
  expiresAt: number; // timestamp in ms
  isVerified: boolean;
}

// In-memory fallback challenge store for local development / testing resilience
const memoryChallenges = new Map<string, OTPChallenge>();

/**
 * Generates a cryptographically secure 6-digit OTP
 */
export function generateOTPCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a SHA-256 hash for secure OTP comparison
 */
export function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/**
 * Creates and registers a new OTP challenge
 * Expires in 5 minutes. Maximum 5 attempts.
 */
export function createOTPChallenge(
  email: string,
  provider: "google" | "email_password",
  userId?: string
): { challengeId: string; rawCode: string; expiresAt: number } {
  const challengeId = crypto.randomUUID();
  const rawCode = generateOTPCode();
  const otpHash = hashOTP(rawCode);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const challenge: OTPChallenge = {
    id: challengeId,
    userId,
    email: email.toLowerCase().trim(),
    otpHash,
    provider,
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    isVerified: false,
  };

  memoryChallenges.set(challengeId, challenge);

  // Auto clean-up expired challenges
  const timer = setTimeout(() => {
    memoryChallenges.delete(challengeId);
  }, 10 * 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }

  return { challengeId, rawCode, expiresAt };
}

export interface VerifyOTPResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
  challenge?: OTPChallenge;
}

/**
 * Verifies an entered OTP code against a challenge
 */
export function verifyOTPChallenge(challengeId: string, enteredCode: string): VerifyOTPResult {
  const challenge = memoryChallenges.get(challengeId);

  if (!challenge) {
    return {
      success: false,
      message: "Verification challenge not found or has expired. Please request a new OTP.",
    };
  }

  if (Date.now() > challenge.expiresAt) {
    memoryChallenges.delete(challengeId);
    return {
      success: false,
      message: "This OTP has expired. Please request a new code.",
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    memoryChallenges.delete(challengeId);
    return {
      success: false,
      message: "Maximum verification attempts exceeded. For security, this challenge was invalidated.",
    };
  }

  const enteredHash = hashOTP(enteredCode);
  if (challenge.otpHash !== enteredHash) {
    challenge.attempts += 1;
    const remaining = challenge.maxAttempts - challenge.attempts;

    if (remaining <= 0) {
      memoryChallenges.delete(challengeId);
      return {
        success: false,
        message: "Maximum verification attempts exceeded. This challenge has been locked.",
        remainingAttempts: 0,
      };
    }

    return {
      success: false,
      message: `Invalid OTP code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
      remainingAttempts: remaining,
    };
  }

  // Verification succeeded
  challenge.isVerified = true;
  memoryChallenges.delete(challengeId);

  return {
    success: true,
    message: "OTP successfully verified.",
    challenge,
  };
}
