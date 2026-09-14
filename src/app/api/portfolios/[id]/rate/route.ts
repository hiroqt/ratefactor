import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ratingSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { getCanonicalEmailHash } from "@/lib/auth/email";
import { pool } from "@/lib/auth/better-auth";
import { getDynamicPortfolios } from "@/lib/dynamic-portfolios";

// In-memory rating storage keyed by canonical mailbox hash to prevent multi-account Sybil manipulation
const userRatings = new Map<string, any>(); // key: `${mailboxHash}:${portfolioId}`

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirrors the deterministic Better Auth -> profile id mapping applied by the
// handle_better_auth_user_sync() trigger in
// supabase/migrations/20260912000000_better_auth.sql: a UUID Better Auth id
// passes through unchanged; any other id maps to md5('ratefactor:' || id)::uuid.
// This lets ownership be resolved by direct id comparison instead of an
// unsafe OR-username lookup (usernames can be collision-adjusted).
function resolveCanonicalProfileId(betterAuthUserId: string): string {
  if (UUID_RE.test(betterAuthUserId)) return betterAuthUserId.toLowerCase();
  const hex = crypto.createHash("md5").update(`ratefactor:${betterAuthUserId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to rate developer portfolios.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;
    const mailboxHash = authUser.email ? getCanonicalEmailHash(authUser.email) : actorId;

    // Self-rating prevention: resolve ownership server-side before any state mutation.
    // The actor's canonical profile id is derived deterministically (see
    // resolveCanonicalProfileId above) rather than looked up by an OR-username
    // match, since Better Auth user ids and public.profiles ids are not always
    // identical and usernames may be collision-adjusted (so equality is only
    // ever used below to strengthen an "owner" result, never to prove non-owner).
    const canonicalActorProfileId = resolveCanonicalProfileId(authUser.id);

    let ownership: "owner" | "not-owner" | "unknown" = "unknown";
    try {
      const portfolioCheck = await pool.query(
        `SELECT author_id FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
      const dbAuthorId = portfolioCheck.rows[0]?.author_id ? String(portfolioCheck.rows[0].author_id) : null;
      if (dbAuthorId) {
        ownership = canonicalActorProfileId === dbAuthorId ? "owner" : "not-owner";
      }
      // If the portfolio row wasn't found, leave ownership "unknown" and fall
      // through to the in-memory check below rather than assuming "not-owner".
    } catch {
      // Database offline/unavailable: fall through to the in-memory portfolio store.
    }

    if (ownership === "unknown") {
      // Database-unresolved case: username equality can only strengthen an
      // "owner" conclusion. Inequality is never treated as proof of non-ownership,
      // so this branch never sets "not-owner" — it either confirms ownership or
      // leaves ownership "unknown" to fail closed below.
      const memoryPortfolio = getDynamicPortfolios().find((p) => p.id === portfolioId);
      if (
        memoryPortfolio?.author?.username &&
        authUser.username &&
        memoryPortfolio.author.username.toLowerCase() === authUser.username.toLowerCase()
      ) {
        ownership = "owner";
      }
    }

    if (ownership === "owner") {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You cannot rate your own portfolio.",
        },
        { status: 403 }
      );
    }

    if (ownership === "unknown") {
      // Fail closed: we could not reliably confirm the actor does not own this
      // portfolio, so the rating is rejected rather than risking a self-rating.
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/service-unavailable",
          title: "Service Unavailable",
          status: 503,
          detail: "Unable to verify portfolio ownership right now. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    // Rate limitation: Max 10 rating updates per minute
    const rateCheck = checkRateLimit(`rate:${mailboxHash}:${portfolioId}:${ip}`, { limit: 10, windowSeconds: 60, debounceSeconds: 1 });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json();
    const parseResult = ratingSubmissionSchema.safeParse({ ...body, portfolioId });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid Rating Criteria",
          status: 400,
          detail: "Rating scores must be between 1.0 and 5.0.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { design, codeQuality, performance, documentation } = parseResult.data;
    const averageScore = Number(
      ((design + codeQuality + performance + documentation) / 4).toFixed(2)
    );

    // Keyed by canonical mailbox hash to eliminate Sybil multi-account duplicate voting
    const key = `${mailboxHash}:${portfolioId}`;
    userRatings.set(key, {
      userId: actorId,
      mailboxHash,
      portfolioId,
      score: averageScore,
      breakdown: { design, codeQuality, performance, documentation },
      updatedAt: new Date().toISOString(),
    });

    // Attempt PostgreSQL database persistence, keyed by the same canonical
    // profile id used for the ownership check above. The portfolio aggregate
    // (rating, rating_count, rating_design, ...) is recalculated automatically
    // by the sync_ratings() trigger on public.ratings (see the rating-integrity
    // migration) — this handler reads that persisted aggregate back afterward
    // rather than recomputing it itself, so the client always receives the
    // real, authoritative persisted values instead of an in-memory guess.
    let aggregate: {
      rating: number;
      ratingCount: number;
      ratingDesign: number;
      ratingCodeQuality: number;
      ratingPerformance: number;
      ratingDocumentation: number;
    };
    try {
      await pool.query(
        `INSERT INTO public.ratings (portfolio_id, user_id, score, design, code_quality, performance, documentation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (portfolio_id, user_id)
         DO UPDATE SET
           score = EXCLUDED.score,
           design = EXCLUDED.design,
           code_quality = EXCLUDED.code_quality,
           performance = EXCLUDED.performance,
           documentation = EXCLUDED.documentation,
           updated_at = NOW()`,
        [portfolioId, canonicalActorProfileId, averageScore, design, codeQuality, performance, documentation]
      );

      const aggregateRes = await pool.query(
        `SELECT rating, rating_count, rating_design, rating_code_quality, rating_performance, rating_documentation
         FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
      const row = aggregateRes.rows[0];
      if (!row) {
        throw new Error("Portfolio aggregate row not found after rating persistence.");
      }

      aggregate = {
        rating: Number(row.rating) || 0,
        ratingCount: Number(row.rating_count) || 0,
        ratingDesign: Number(row.rating_design) || 0,
        ratingCodeQuality: Number(row.rating_code_quality) || 0,
        ratingPerformance: Number(row.rating_performance) || 0,
        ratingDocumentation: Number(row.rating_documentation) || 0,
      };
    } catch (dbErr) {
      // Persistence (or reading back the authoritative aggregate) failed:
      // do not report success, since the rating was not durably recorded.
      console.warn("[POST rate] Database persist error:", dbErr);
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/persistence-failed",
          title: "Rating Not Persisted",
          status: 502,
          detail: "Your rating could not be saved right now. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Rating successfully recorded.",
      portfolioId,
      score: averageScore,
      breakdown: { design, codeQuality, performance, documentation },
      rating: aggregate.rating,
      ratingCount: aggregate.ratingCount,
      ratingBreakdown: {
        design: aggregate.ratingDesign,
        codeQuality: aggregate.ratingCodeQuality,
        performance: aggregate.ratingPerformance,
        documentation: aggregate.ratingDocumentation,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to submit rating.",
      },
      { status: 500 }
    );
  }
}
