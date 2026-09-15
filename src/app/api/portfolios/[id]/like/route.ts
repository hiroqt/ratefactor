import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { getCanonicalEmailHash } from "@/lib/auth/email";
import { pool } from "@/lib/auth/better-auth";
import { getDynamicPortfolios, invalidatePortfoliosCache } from "@/lib/dynamic-portfolios";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

// In-memory like tracker keyed by canonical mailbox hash to prevent multi-account like manipulation
const userLikes = new Map<string, Set<string>>(); // mailboxHash -> Set of portfolioIds

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    // Guardrail: Non-logged-in or unauthenticated users cannot like
    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to like or heart portfolios.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;
    const mailboxHash = authUser.email ? getCanonicalEmailHash(authUser.email) : actorId;

    // Self-engagement prevention: resolve ownership server-side before any
    // state mutation (in-memory or database). Mirrors the rating endpoint's
    // approach exactly: the actor's canonical profile id is derived
    // deterministically rather than looked up by an OR-username match, and
    // if ownership can't be reliably determined the request fails closed
    // instead of risking a self-like.
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
          detail: "You cannot like or react to your own portfolio.",
        },
        { status: 403 }
      );
    }

    if (ownership === "unknown") {
      // Fail closed: we could not reliably confirm the actor does not own this
      // portfolio, so the like is rejected rather than risking a self-like.
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

    // Anti-Abuse Rate Limitation: Max 20 likes per minute, min 1s cooldown
    const rateCheck = checkRateLimit(`like:${mailboxHash}:${portfolioId}:${ip}`, "LIKE");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    let likedSet = userLikes.get(mailboxHash);
    if (!likedSet) {
      likedSet = new Set();
      userLikes.set(mailboxHash, likedSet);
    }

    const currentlyLiked = likedSet.has(portfolioId);
    const newLikedState = !currentlyLiked;

    if (newLikedState) {
      likedSet.add(portfolioId);
    } else {
      likedSet.delete(portfolioId);
    }

    // Attempt PostgreSQL database persistence and exact count synchronization,
    // keyed by the same canonical profile id used for the ownership check above.
    let finalLikesCount = 0;
    for (const set of userLikes.values()) {
      if (set.has(portfolioId)) finalLikesCount++;
    }

    try {
      // Check if portfolio exists in database
      const portfolioCheck = await pool.query(
        `SELECT id, author_id, title FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
      const portfolioRow = portfolioCheck.rows[0];

      if (newLikedState) {
        await pool.query(
          `INSERT INTO public.likes (id, portfolio_id, user_id, created_at)
           VALUES (gen_random_uuid(), $1, $2, NOW())
           ON CONFLICT (portfolio_id, user_id) DO NOTHING`,
          [portfolioId, canonicalActorProfileId]
        );

        // Dedicated notification for portfolio owner (excluding self-like)
        if (
          portfolioRow &&
          portfolioRow.author_id &&
          String(portfolioRow.author_id) !== String(canonicalActorProfileId)
        ) {
          await pool.query(
            `INSERT INTO public.notifications (
              id, recipient_id, actor_id, portfolio_id, portfolio_title, type, message, is_read, created_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, 'like', 'liked your portfolio', false, NOW()
            )`,
            [
              portfolioRow.author_id,
              canonicalActorProfileId,
              portfolioId,
              portfolioRow.title || "Portfolio",
            ]
          );
        }
      } else {
        await pool.query(
          `DELETE FROM public.likes WHERE portfolio_id = $1 AND user_id = $2`,
          [portfolioId, canonicalActorProfileId]
        );

        // Clean up unread like notification if unliked
        if (portfolioRow && portfolioRow.author_id) {
          await pool.query(
            `DELETE FROM public.notifications
             WHERE recipient_id = $1 AND actor_id = $2 AND portfolio_id = $3 AND type = 'like' AND is_read = false`,
            [portfolioRow.author_id, canonicalActorProfileId, portfolioId]
          );
        }
      }

      // Strictly recalculate exact count from database to prevent drift
      const countRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM public.likes WHERE portfolio_id = $1`,
        [portfolioId]
      );
      finalLikesCount = countRes.rows[0]?.count ?? 0;

      await pool.query(
        `UPDATE public.portfolios SET likes_count = $1, updated_at = NOW() WHERE id = $2`,
        [finalLikesCount, portfolioId]
      );
    } catch (dbErr) {
      console.warn("[POST like] Database persist notice:", dbErr);
    }

    invalidatePortfoliosCache();

    return NextResponse.json({
      portfolioId,
      isLiked: newLikedState,
      likesCount: finalLikesCount,
      message: newLikedState ? "Portfolio liked." : "Portfolio unliked.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to process like action.",
      },
      { status: 500 }
    );
  }
}
