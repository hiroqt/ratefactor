import { NextRequest, NextResponse } from "next/server";
import { commentReportSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: portfolioId, commentId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Sign in to report inappropriate comments for moderation.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;

    // Rate limit reporting: max 5 reports per 10 minutes
    const rateCheck = checkRateLimit(`report:${actorId}:${ip}`, { limit: 5, windowSeconds: 600 });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json();
    const parseResult = commentReportSchema.safeParse({ ...body, commentId });
    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid Report Submission",
          status: 400,
          detail: "Please provide a valid report reason.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Thank you. The comment has been flagged for platform moderator review.",
      commentId,
      status: "pending_review",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to process report.",
      },
      { status: 500 }
    );
  }
}
