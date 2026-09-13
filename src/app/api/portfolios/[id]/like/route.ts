import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { getCanonicalEmailHash } from "@/lib/auth/email";

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
