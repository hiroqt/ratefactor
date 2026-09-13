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
        if (newLikedState) {
          await pool.query(
            `INSERT INTO public.likes (portfolio_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [portfolioId, authorProfileId]
          );
          await pool.query(
            `UPDATE public.portfolios SET likes_count = likes_count + 1 WHERE id = $1`,
            [portfolioId]
          );
        } else {
          await pool.query(
            `DELETE FROM public.likes WHERE portfolio_id = $1 AND user_id = $2`,
            [portfolioId, authorProfileId]
          );
          await pool.query(
            `UPDATE public.portfolios SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1`,
            [portfolioId]
          );
        }
      }
    } catch (dbErr) {
      console.warn("[POST like] Database persist notice:", dbErr);
    }

    return NextResponse.json({
      portfolioId,
      isLiked: newLikedState,
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
