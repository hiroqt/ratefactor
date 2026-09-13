import { NextRequest, NextResponse } from "next/server";
import { ratingSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { getCanonicalEmailHash } from "@/lib/auth/email";
import { pool } from "@/lib/auth/better-auth";

// In-memory rating storage keyed by canonical mailbox hash to prevent multi-account Sybil manipulation
const userRatings = new Map<string, any>(); // key: `${mailboxHash}:${portfolioId}`

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

    let portfolioRatingCount = 0;
    for (const r of userRatings.values()) {
      if (r.portfolioId === portfolioId) portfolioRatingCount++;
    }

    // Attempt PostgreSQL database persistence
    try {
      let authorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );
      if (profileCheck.rows && profileCheck.rows.length > 0) {
        authorProfileId = profileCheck.rows[0].id;
      }

      if (authorProfileId) {
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
          [portfolioId, authorProfileId, averageScore, design, codeQuality, performance, documentation]
        );

        // Update aggregated portfolio ratings
        await pool.query(
          `UPDATE public.portfolios SET
             rating = COALESCE((SELECT ROUND(AVG(score), 2) FROM public.ratings WHERE portfolio_id = $1), 5.0),
             rating_count = (SELECT COUNT(*) FROM public.ratings WHERE portfolio_id = $1),
             rating_design = COALESCE((SELECT ROUND(AVG(design), 2) FROM public.ratings WHERE portfolio_id = $1), 5.0),
             rating_code_quality = COALESCE((SELECT ROUND(AVG(code_quality), 2) FROM public.ratings WHERE portfolio_id = $1), 5.0),
             rating_performance = COALESCE((SELECT ROUND(AVG(performance), 2) FROM public.ratings WHERE portfolio_id = $1), 5.0),
             rating_documentation = COALESCE((SELECT ROUND(AVG(documentation), 2) FROM public.ratings WHERE portfolio_id = $1), 5.0)
           WHERE id = $1`,
          [portfolioId]
        );
      }
    } catch (dbErr) {
      console.warn("[POST rate] Database persist notice:", dbErr);
    }

    return NextResponse.json({
      message: "Rating successfully recorded.",
      portfolioId,
      score: averageScore,
      breakdown: { design, codeQuality, performance, documentation },
      ratingCount: portfolioRatingCount || 1,
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
