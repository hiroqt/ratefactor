import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { getCanonicalEmailHash } from "@/lib/auth/email";
import { pool } from "@/lib/auth/better-auth";

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

    // Attempt PostgreSQL database persistence and exact count synchronization
    let finalLikesCount = 0;
    for (const set of userLikes.values()) {
      if (set.has(portfolioId)) finalLikesCount++;
    }

    try {
      let actorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );
      if (profileCheck.rows && profileCheck.rows.length > 0) {
        actorProfileId = profileCheck.rows[0].id;
      }

      // Check if portfolio exists in database
      const portfolioCheck = await pool.query(
        `SELECT id, author_id, title FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
      const portfolioRow = portfolioCheck.rows[0];

      if (actorProfileId) {
        if (newLikedState) {
          await pool.query(
            `INSERT INTO public.likes (id, portfolio_id, user_id, created_at) 
             VALUES (gen_random_uuid(), $1, $2, NOW()) 
             ON CONFLICT (portfolio_id, user_id) DO NOTHING`,
            [portfolioId, actorProfileId]
          );

          // Dedicated notification for portfolio owner (excluding self-like)
          if (
            portfolioRow &&
            portfolioRow.author_id &&
            String(portfolioRow.author_id) !== String(actorProfileId)
          ) {
            await pool.query(
              `INSERT INTO public.notifications (
                id, recipient_id, actor_id, portfolio_id, portfolio_title, type, message, is_read, created_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, 'like', 'liked your portfolio', false, NOW()
              )`,
              [
                portfolioRow.author_id,
                actorProfileId,
                portfolioId,
                portfolioRow.title || "Portfolio",
              ]
            );
          }
        } else {
          await pool.query(
            `DELETE FROM public.likes WHERE portfolio_id = $1 AND user_id = $2`,
            [portfolioId, actorProfileId]
          );

          // Clean up unread like notification if unliked
          if (portfolioRow && portfolioRow.author_id) {
            await pool.query(
              `DELETE FROM public.notifications 
               WHERE recipient_id = $1 AND actor_id = $2 AND portfolio_id = $3 AND type = 'like' AND is_read = false`,
              [portfolioRow.author_id, actorProfileId, portfolioId]
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
      }
    } catch (dbErr) {
      console.warn("[POST like] Database persist notice:", dbErr);
    }

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
