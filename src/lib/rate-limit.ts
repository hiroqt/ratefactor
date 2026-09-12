export interface RateLimitConfig {
  limit: number;       // Maximum requests allowed in the window
  windowSeconds: number; // Time window duration in seconds
  debounceSeconds?: number; // Minimum cooldown interval between two consecutive requests
}

export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfig> = {
  // Likes: Max 15 per minute, at least 1.5 seconds cooldown
  LIKE: {
    limit: 15,
    windowSeconds: 60,
    debounceSeconds: 1.5,
  },
  // Comments: Max 3 per minute, at least 10 seconds cooldown between comments
  COMMENT: {
    limit: 3,
    windowSeconds: 60,
    debounceSeconds: 10,
  },
  // Submissions: Max 5 portfolios per 24 hours to protect 500MB DB
  SUBMIT_PORTFOLIO: {
    limit: 5,
    windowSeconds: 86400,
    debounceSeconds: 30,
  },
  // Login attempts: Max 5 failed attempts per 15 minutes
  LOGIN_ATTEMPT: {
    limit: 5,
    windowSeconds: 900,
    debounceSeconds: 2,
  },
  // OTP requests: Max 3 requests per 10 minutes to prevent SMS/email flooding
  OTP_REQUEST: {
    limit: 3,
    windowSeconds: 600,
    debounceSeconds: 30,
  },
};

interface WindowEntry {
  timestamps: number[];
  lastRequestAt: number;
}

const windowStore = new Map<string, WindowEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
  reason?: string;
}

/**
 * Evaluates request against sliding window rate limit and optional debounce interval
 */
export function checkRateLimit(
  identifier: string,
  presetOrConfig: RateLimitConfig | keyof typeof RATE_LIMIT_PRESETS
): RateLimitResult {
  const config: RateLimitConfig =
    typeof presetOrConfig === "string"
      ? RATE_LIMIT_PRESETS[presetOrConfig] || { limit: 60, windowSeconds: 60 }
      : presetOrConfig;

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = windowStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [], lastRequestAt: 0 };
    windowStore.set(identifier, entry);
  }

  // Check debounce / cooldown
  if (config.debounceSeconds && entry.lastRequestAt > 0) {
    const elapsedSinceLast = (now - entry.lastRequestAt) / 1000;
    if (elapsedSinceLast < config.debounceSeconds) {
      const waitTime = Math.ceil(config.debounceSeconds - elapsedSinceLast);
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetSeconds: waitTime,
        retryAfterSeconds: waitTime,
        reason: `Action cooldown active. Please wait ${waitTime}s before trying again.`,
      };
    }
  }

  // Prune timestamps older than the sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.limit) {
    const oldestTimestamp = entry.timestamps[0];
    const resetTimeMs = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetSeconds: retryAfterSeconds,
      retryAfterSeconds,
      reason: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.windowSeconds}s. Try again in ${retryAfterSeconds}s.`,
    };
  }

  // Allow request and record timestamp
  entry.timestamps.push(now);
  entry.lastRequestAt = now;

  const remaining = Math.max(0, config.limit - entry.timestamps.length);
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  return {
    allowed: true,
    limit: config.limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Creates RFC 7807 Problem Details response for rate limit violations
 */
export function createRateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      type: "https://ratefactor.dev/errors/rate-limit-exceeded",
      title: "Too Many Requests",
      status: 429,
      detail: result.reason || "Rate limit quota exceeded.",
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/problem+json",
        "Retry-After": String(result.retryAfterSeconds || 60),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetSeconds),
      },
    }
  );
}
