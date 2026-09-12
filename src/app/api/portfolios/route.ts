import { NextRequest, NextResponse } from "next/server";
import { portfolioSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";
import { getSessionUser } from "@/lib/auth/server-session";

// In-memory runtime cache for newly added portfolios when Supabase DB is in mock/dev state
let dynamicPortfolios = [...INITIAL_PORTFOLIOS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "All";
    const hostParam = (searchParams.get("host") || "").toLowerCase().trim();
    const sort = searchParams.get("sort") || "highest_rated";
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    let filtered = [...dynamicPortfolios];

    // Filter by Category / Domain
    if (category !== "All") {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filter by Host / TLD
    if (hostParam && hostParam !== "all") {
      filtered = filtered.filter((p) => {
        let domain = "";
        try {
          if (p.portfolioUrl) {
            domain = new URL(
              p.portfolioUrl.startsWith("http") ? p.portfolioUrl : `https://${p.portfolioUrl}`
            ).hostname.toLowerCase();
          }
        } catch {}

        if (hostParam.startsWith(".")) {
          return domain.endsWith(hostParam) || p.portfolioUrl?.toLowerCase().includes(hostParam);
        }
        return domain.includes(hostParam);
      });
    }

    // Filter by Search Query (Primary Domain, Username, Title, Tech Stack)
    if (query) {
      filtered = filtered.filter((p) => {
        let domain = "";
        try {
          if (p.portfolioUrl) {
            domain = new URL(
              p.portfolioUrl.startsWith("http") ? p.portfolioUrl : `https://${p.portfolioUrl}`
            ).hostname.toLowerCase();
          }
        } catch {}

        return (
          p.title?.toLowerCase().includes(query) ||
          p.tagline?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.author?.name?.toLowerCase().includes(query) ||
          p.author?.username?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          (domain && domain.includes(query)) ||
          p.portfolioUrl?.toLowerCase().includes(query) ||
          (p.demoUrl && p.demoUrl.toLowerCase().includes(query)) ||
          p.techStack?.some((t) => t.toLowerCase().includes(query))
        );
      });
    }

    // Sort order
    if (sort === "highest_rated") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === "most_liked") {
      filtered.sort((a, b) => b.likesCount - a.likesCount);
    } else if (sort === "most_discussed") {
      filtered.sort((a, b) => b.commentsCount - a.commentsCount);
    } else if (sort === "latest") {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === "showcase") {
      filtered.sort((a, b) => (b.isShowcase ? 1 : 0) - (a.isShowcase ? 1 : 0));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      portfolios: paginated,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to query portfolios.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    // Guest protection: Guests cannot submit portfolios
    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to submit a developer portfolio.",
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;

    // Rate limitation: Max 5 submissions per 24 hours per user
    const rateCheck = checkRateLimit(`submit:${actorId}:${ip}`, "SUBMIT_PORTFOLIO");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json();
    const parseResult = portfolioSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Portfolio Validation Failed",
          status: 400,
          detail: "Submission does not satisfy constraints (e.g. 200 words min, 2 MB max image).",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const id = `${slug}-${Date.now().toString(36)}`;

    const newPortfolio = {
      id,
      title: data.title,
      tagline: data.tagline,
      description: data.description,
      portfolioUrl: data.portfolioUrl,
      githubUrl: data.githubUrl,
      demoUrl: data.demoUrl || data.portfolioUrl,
      thumbnail: data.thumbnailUrl,
      imageSizeBytes: data.imageSizeBytes,
      author: {
        name: body.authorName || authUser.name || "Principal Architect",
        username: body.authorUsername || authUser.username || "arneldev",
        avatar: body.authorAvatar || authUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        role: "Fullstack Architect",
        isVerified: true,
      },
      techStack: data.techStack,
      category: data.category,
      rating: 5.0,
      ratingCount: 1,
      ratingBreakdown: {
        design: 5.0,
        codeQuality: 5.0,
        performance: 5.0,
      },
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
    };

    dynamicPortfolios.unshift(newPortfolio as any);

    return NextResponse.json(
      {
        message: "Portfolio successfully submitted and indexed.",
        portfolio: newPortfolio,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to create portfolio.",
      },
      { status: 500 }
    );
  }
}
