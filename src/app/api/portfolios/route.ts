import { NextRequest, NextResponse } from "next/server";
import { portfolioSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { pool } from "@/lib/auth/better-auth";
import { Portfolio } from "@/types/portfolio";
import { portfolioComments } from "@/lib/comments-store";
import { getDynamicPortfolios, setDynamicPortfolios } from "@/lib/dynamic-portfolios";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "All";
    const hostParam = (searchParams.get("host") || "").toLowerCase().trim();
    const sort = searchParams.get("sort") || "highest_rated";
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    let dynamicPortfolios = [...getDynamicPortfolios()];

    // Attempt to query PostgreSQL database if connection is available
    try {
      const dbRes = await pool.query(`
        SELECT 
          p.id,
          p.title,
          p.tagline,
          p.description,
          p.portfolio_url as "portfolioUrl",
          p.github_url as "githubUrl",
          p.demo_url as "demoUrl",
          p.thumbnail_url as "thumbnail",
          p.image_size_bytes as "imageSizeBytes",
          p.category,
          p.tech_stack as "techStack",
          p.rating,
          p.rating_count as "ratingCount",
          p.rating_design as "ratingDesign",
          p.rating_code_quality as "ratingCodeQuality",
          p.rating_performance as "ratingPerformance",
          p.rating_documentation as "ratingDocumentation",
          p.likes_count as "likesCount",
          p.comments_count as "commentsCount",
          p.is_showcase as "isShowcase",
          p.showcase_type as "showcaseType",
          p.showcase_reason as "showcaseReason",
          p.request_critique as "requestCritique",
          p.created_at as "createdAt",
          pr.id as "authorProfileId",
          pr.full_name as "authorName",
          pr.username as "authorUsername",
          pr.avatar_url as "authorAvatar",
          pr.role as "authorRole",
          pr.is_verified as "authorIsVerified",
          pr.available_for_hire as "authorAvailableForHire"
        FROM public.portfolios p
        LEFT JOIN public.profiles pr ON p.author_id = pr.id
        WHERE p.status = 'published'
        ORDER BY p.created_at DESC
      `);

      if (dbRes.rows && dbRes.rows.length > 0) {
        const dbPortfolios: Portfolio[] = dbRes.rows.map((row) => ({
          id: row.id,
          title: row.title,
          tagline: row.tagline,
          description: row.description || "",
          portfolioUrl: row.portfolioUrl,
          githubUrl: row.githubUrl,
          demoUrl: row.demoUrl || row.portfolioUrl,
          thumbnail: row.thumbnail,
          imageSizeBytes: row.imageSizeBytes || 1024 * 500,
          category: row.category,
          techStack: Array.isArray(row.techStack) ? row.techStack : [],
          rating: Number(row.rating) || 5.0,
          ratingCount: Number(row.ratingCount) || 1,
          ratingBreakdown: {
            design: Number(row.ratingDesign) || 5.0,
            codeQuality: Number(row.ratingCodeQuality) || 5.0,
            performance: Number(row.ratingPerformance) || 5.0,
            documentation: Number(row.ratingDocumentation) || 5.0,
          },
          likesCount: Number(row.likesCount) || 0,
          commentsCount: Number(row.commentsCount) || 0,
          comments: portfolioComments.get(row.id) || [],
          isShowcase: Boolean(row.isShowcase),
          showcaseType: row.showcaseType || null,
          showcaseReason: row.showcaseReason || null,
          requestCritique: Boolean(row.requestCritique),
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
          author: {
            name: row.authorName || "Developer",
            username: row.authorUsername || "dev",
            avatar: row.authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
            role: row.authorRole || "developer",
            isVerified: Boolean(row.authorIsVerified),
            availableForHire: row.authorAvailableForHire ?? true,
          },
        }));

        // Merge DB rows into dynamicPortfolios without duplicates
        const map = new Map<string, Portfolio>();
        dbPortfolios.forEach((p) => map.set(p.id, p));
        dynamicPortfolios.forEach((p) => {
          if (!map.has(p.id)) {
            map.set(p.id, p);
          }
        });
        dynamicPortfolios = Array.from(map.values());
        setDynamicPortfolios(dynamicPortfolios);
      }
    } catch {
      // Graceful fallback to dynamicPortfolios in-memory store
    }

    // Query real developer count from database
    let totalDevelopers = 0;
    try {
      const devRes = await pool.query(`SELECT COUNT(DISTINCT id) as count FROM public.profiles`);
      if (devRes.rows && devRes.rows.length > 0) {
        totalDevelopers = Number(devRes.rows[0].count) || 0;
      }
    } catch {
      const authorSet = new Set<string>();
      dynamicPortfolios.forEach((p) => {
        if (p.author?.username) authorSet.add(p.author.username.toLowerCase());
      });
      totalDevelopers = authorSet.size;
    }

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

    return NextResponse.json(
      {
        portfolios: paginated,
        totalDevelopers,
        developersCount: totalDevelopers,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
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

    const newPortfolio: Portfolio = {
      id,
      title: data.title,
      tagline: data.tagline,
      description: data.description || data.tagline || "",
      portfolioUrl: data.portfolioUrl,
      githubUrl: data.githubUrl,
      demoUrl: data.demoUrl || data.portfolioUrl,
      thumbnail: data.thumbnailUrl,
      imageSizeBytes: data.imageSizeBytes,
      author: {
        name: body.authorName || authUser.name || "Developer",
        username: body.authorUsername || authUser.username || "dev",
        avatar: body.authorAvatar || authUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        role: (authUser.role as any) || "developer",
        isVerified: true,
        availableForHire: true,
      },
      techStack: data.techStack,
      category: data.category,
      rating: 5.0,
      ratingCount: 1,
      ratingBreakdown: {
        design: 5.0,
        codeQuality: 5.0,
        performance: 5.0,
        documentation: 5.0,
      },
      requestCritique: Boolean(data.requestCritique),
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
    };

    // Attempt PostgreSQL database persistence
    try {
      let authorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id FROM public.profiles WHERE id = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );

      if (profileCheck.rows && profileCheck.rows.length > 0) {
        authorProfileId = profileCheck.rows[0].id;
      } else {
        const insertProfile = await pool.query(
          `INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
           RETURNING id`,
          [
            authUser.id,
            authUser.username || `dev_${Date.now().toString(36)}`,
            authUser.name || "Developer",
            authUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
            authUser.role || "developer",
          ]
        );
        if (insertProfile.rows && insertProfile.rows.length > 0) {
          authorProfileId = insertProfile.rows[0].id;
        }
      }

      if (authorProfileId) {
        await pool.query(
          `INSERT INTO public.portfolios (
            id, author_id, title, tagline, description, portfolio_url, github_url, demo_url,
            thumbnail_url, image_size_bytes, category, tech_stack, rating, rating_count,
            rating_design, rating_code_quality, rating_performance, rating_documentation,
            likes_count, comments_count, is_showcase, status, request_critique
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 5.0, 1, 5.0, 5.0, 5.0, 5.0, 1, 0, false, 'published', $13)
          ON CONFLICT (id) DO NOTHING`,
          [
            id,
            authorProfileId,
            data.title,
            data.tagline,
            data.description || null,
            data.portfolioUrl,
            data.githubUrl,
            data.demoUrl || data.portfolioUrl,
            data.thumbnailUrl,
            data.imageSizeBytes || 1024 * 500,
            data.category,
            data.techStack,
            Boolean(data.requestCritique),
          ]
        );
      }
    } catch (dbErr) {
      console.warn("[POST /api/portfolios] Database persist notice:", dbErr);
    }

    const currentPortfolios = getDynamicPortfolios();
    currentPortfolios.unshift(newPortfolio);
    setDynamicPortfolios(currentPortfolios);

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
