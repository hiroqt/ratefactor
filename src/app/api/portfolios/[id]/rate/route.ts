import { NextRequest, NextResponse } from "next/server";
import { ratingSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";

// In-memory rating storage
const userRatings = new Map<string, any>(); // key: `${userId}:${portfolioId}`

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

    // Rate limitation: Max 10 rating updates per minute
    const rateCheck = checkRateLimit(`rate:${actorId}:${portfolioId}:${ip}`, { limit: 10, windowSeconds: 60, debounceSeconds: 1 });
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

    const { design, codeQuality, performance } = parseResult.data;
    const averageScore = Number(
      ((design + codeQuality + performance) / 3).toFixed(2)
    );

    const key = `${actorId}:${portfolioId}`;
    userRatings.set(key, {
      userId: actorId,
      portfolioId,
      score: averageScore,
      breakdown: { design, codeQuality, performance },
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Rating successfully recorded.",
      portfolioId,
      score: averageScore,
      breakdown: { design, codeQuality, performance },
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
