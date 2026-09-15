import { NextRequest, NextResponse } from "next/server";
import { portfolioSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { pool } from "@/lib/auth/better-auth";
import { Portfolio } from "@/types/portfolio";
import { portfolioComments } from "@/lib/comments-store";
import { 
  getCachedPortfolios, 
  setCachedPortfolios, 
  invalidatePortfoliosCache, 
  getDynamicPortfolios, 
  setDynamicPortfolios 
} from "@/lib/dynamic-portfolios";
import { verifyGithubProjectRelationship } from "@/lib/github/repository-verification";
import { invalidateDevelopersCache } from "@/lib/developers-cache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "All";
    const hostParam = (searchParams.get("host") || "").toLowerCase().trim();
    const sort = searchParams.get("sort") || "highest_rated";
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const ifNoneMatch = req.headers.get("if-none-match");
    const isDefaultQuery =
      category === "All" &&
      (!hostParam || hostParam === "all") &&
      !query &&
      sort === "highest_rated" &&
      offset === 0;
    let cached = getCachedPortfolios();

    let dynamicPortfolios = [...getDynamicPortfolios()];
    let databasePortfolios: Portfolio[] | null = null;
    let databaseTotal = 0;
    let totalDevelopers = 0;

    // Resolve authenticated user profile ID if present to determine isLiked
    let currentProfileId: string | null = null;
    try {
      const authUser = await getSessionUser(req).catch(() => null);
      if (authUser) {
        const pCheck = await pool.query(
          `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
          [authUser.id, authUser.username || ""]
        );
        if (pCheck.rows[0]) currentProfileId = String(pCheck.rows[0].id);
      }
    } catch {}

    // HTTP 304 Not Modified check: if public feed hasn't changed and ETag matches, return 0 body bytes
    if (isDefaultQuery && !currentProfileId && cached.isFresh && ifNoneMatch && ifNoneMatch === cached.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cached.etag,
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    // Load user's likes if authenticated
    const userLikedSet = new Set<string>();
    if (currentProfileId) {
      try {
        const likesRes = await pool.query(
          `SELECT portfolio_id FROM public.likes WHERE user_id = $1`,
          [currentProfileId]
        );
        likesRes.rows.forEach((r) => userLikedSet.add(r.portfolio_id));
      } catch {}
    }

    // If default query and cache is fresh, serve directly from L1 memory cache (0 database queries / 0 egress!)
    if (isDefaultQuery && cached.isFresh) {
      const sliced = cached.portfolios.slice(offset, offset + limit).map((p) => ({
        ...p,
        isLiked: userLikedSet.has(p.id),
      }));
      return NextResponse.json(
        {
          portfolios: sliced,
          totalDevelopers: cached.developersCount,
          developersCount: cached.developersCount,
          pagination: {
            total: cached.portfolios.length,
            offset,
            limit,
            hasMore: offset + limit < cached.portfolios.length,
          },
        },
        {
          status: 200,
          headers: {
            ETag: cached.etag,
            "Cache-Control": currentProfileId
              ? "private, no-cache"
              : "public, s-maxage=30, stale-while-revalidate=120",
          },
        }
      );
    }

    // Attempt to query PostgreSQL database if connection is available
    try {
      const filters = ["p.status = 'published'"];
      const filterValues: (string | number)[] = [];
      const addFilter = (sql: string, value: string) => {
        filterValues.push(value);
        filters.push(sql.replace("?", `$${filterValues.length}`));
      };
      const hostname = "LOWER(REGEXP_REPLACE(SPLIT_PART(REGEXP_REPLACE(COALESCE(p.portfolio_url, ''), '^[a-zA-Z][a-zA-Z0-9+.-]*://', ''), '/', 1), ':[0-9]+$', ''))";
      const likeValue = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;

      if (category !== "All") addFilter("p.category::text = ?", category);
      if (hostParam && hostParam !== "all") {
        const hostValue = likeValue(hostParam);
        if (hostParam.startsWith(".")) {
          filterValues.push(hostValue, hostValue);
          filters.push(`(${hostname} LIKE $${filterValues.length - 1} ESCAPE '\\' OR LOWER(COALESCE(p.portfolio_url, '')) LIKE $${filterValues.length} ESCAPE '\\')`);
        } else {
          addFilter(`${hostname} LIKE ? ESCAPE '\\'`, hostValue);
        }
      }
      if (query) {
        const queryValue = likeValue(query);
        filterValues.push(queryValue);
        const queryParam = `$${filterValues.length}`;
        filters.push(`(
          LOWER(COALESCE(p.title, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.tagline, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.description, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(pr.full_name, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(pr.username, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.category::text, '')) LIKE ${queryParam} ESCAPE '\\'
          OR ${hostname} LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.portfolio_url, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.demo_url, '')) LIKE ${queryParam} ESCAPE '\\'
          OR LOWER(COALESCE(p.tech_stack::text, '')) LIKE ${queryParam} ESCAPE '\\'
        )`);
      }

      const whereClause = filters.join(" AND ");
      const orderBy = sort === "most_liked"
        ? '"likesCount" DESC, p.created_at DESC'
        : sort === "most_discussed"
          ? '"commentsCount" DESC, p.created_at DESC'
          : sort === "showcase"
            ? 'COALESCE(p.is_showcase, false) DESC, p.created_at DESC'
            : sort === "highest_rated"
              ? 'COALESCE(p.rating, 0) DESC, p.created_at DESC'
              : "p.created_at DESC";
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM public.portfolios p LEFT JOIN public.profiles pr ON p.author_id = pr.id WHERE ${whereClause}`,
        filterValues
      );
      databaseTotal = Number(countRes.rows[0]?.total) || 0;
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
          COALESCE((SELECT COUNT(*)::int FROM public.likes l WHERE l.portfolio_id = p.id), p.likes_count, 0) as "likesCount",
          COALESCE((SELECT COUNT(*)::int FROM public.comments c WHERE c.portfolio_id = p.id AND c.status = 'approved' AND c.is_reported = false), p.comments_count, 0) as "commentsCount",
          p.is_showcase as "isShowcase",
          p.showcase_type as "showcaseType",
          p.showcase_reason as "showcaseReason",
          p.request_critique as "requestCritique",
          p.github_verification_status as "githubVerificationStatus",
          p.github_verified_login as "githubVerifiedLogin",
          p.github_repository_full_name as "githubRepositoryFullName",
          p.github_verified_at as "githubVerifiedAt",
          p.created_at as "createdAt",
          pr.id as "authorProfileId",
          pr.full_name as "authorName",
          pr.username as "authorUsername",
          pr.avatar_url as "authorAvatar",
          pr.role as "authorRole",
          pr.is_verified as "authorIsVerified",
          pr.available_for_hire as "authorAvailableForHire",
          pr.created_at as "authorCreatedAt"
        FROM public.portfolios p
        LEFT JOIN public.profiles pr ON p.author_id = pr.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}
      `, [...filterValues, limit, offset]);

      // Batch load real approved comments from database
      const dbCommentsMap = new Map<string, any[]>();
      try {
        const portfolioIds = dbRes.rows.map((row) => String(row.id));
        const commentsQuery = portfolioIds.length ? await pool.query(`
          SELECT 
            c.id,
            c.portfolio_id as "portfolioId",
            c.user_id as "userId",
            c.content,
            c.critique_tag as "critiqueTag",
            c.created_at as "createdAt",
            c.status,
            c.is_reported as "isReported",
            COALESCE(pr.full_name, 'Developer') as "authorName",
            COALESCE(pr.username, 'dev') as "authorUsername",
            COALESCE(pr.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80') as "authorAvatar"
          FROM public.comments c
          LEFT JOIN public.profiles pr ON c.user_id = pr.id
          WHERE c.status = 'approved' AND c.is_reported = false
            AND c.portfolio_id::text = ANY($1::text[])
          ORDER BY c.created_at DESC
        `, [portfolioIds]) : { rows: [] };

        for (const row of commentsQuery.rows) {
          const item = {
            id: String(row.id),
            authorName: row.authorName,
            authorUsername: row.authorUsername,
            authorAvatar: row.authorAvatar,
            content: row.content,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            likes: 0,
            isUserOwner: Boolean(currentProfileId && String(row.userId) === currentProfileId),
            critiqueTag: row.critiqueTag || null,
          };
          const existing = dbCommentsMap.get(row.portfolioId) || [];
          existing.push(item);
          dbCommentsMap.set(row.portfolioId, existing);
        }
      } catch {}

      // Batch load user's likes if authenticated (if not already loaded)
      if (currentProfileId && userLikedSet.size === 0) {
        try {
          const likesRes = await pool.query(
            `SELECT portfolio_id FROM public.likes WHERE user_id = $1 AND portfolio_id::text = ANY($2::text[])`,
            [currentProfileId, dbRes.rows.map((row) => String(row.id))]
          );
          likesRes.rows.forEach((r) => userLikedSet.add(r.portfolio_id));
        } catch {}
      }

      if (dbRes.rows) {
        const dbPortfolios: Portfolio[] = dbRes.rows.map((row) => {
          const pid = row.id;
          const comments = dbCommentsMap.get(pid) || portfolioComments.get(pid) || [];
          const likesCount = Number(row.likesCount) || 0;
          const commentsCount = Math.max(Number(row.commentsCount) || 0, comments.length);

          return {
            id: pid,
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
            rating: Number(row.rating) || 0,
            ratingCount: Number(row.ratingCount) || 0,
            ratingBreakdown: {
              design: Number(row.ratingDesign) || 0,
              codeQuality: Number(row.ratingCodeQuality) || 0,
              performance: Number(row.ratingPerformance) || 0,
              documentation: Number(row.ratingDocumentation) || 0,
            },
            likesCount,
            isLiked: userLikedSet.has(pid),
            commentsCount,
            comments,
            isShowcase: Boolean(row.isShowcase),
            showcaseType: row.showcaseType || null,
            showcaseReason: row.showcaseReason || null,
            requestCritique: Boolean(row.requestCritique),
            githubVerification: row.githubVerificationStatus
              ? {
                  status: row.githubVerificationStatus,
                  login: row.githubVerifiedLogin || undefined,
                  repositoryFullName: row.githubRepositoryFullName || undefined,
                  verifiedAt: row.githubVerifiedAt ? new Date(row.githubVerifiedAt).toISOString() : undefined,
                }
              : undefined,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            author: {
              name: row.authorName || "Developer",
              username: row.authorUsername || "dev",
              avatar: row.authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
              role: row.authorRole || "developer",
              isVerified: Boolean(row.authorIsVerified),
              availableForHire: row.authorAvailableForHire ?? true,
              createdAt: row.authorCreatedAt ? new Date(row.authorCreatedAt).toISOString() : undefined,
              joinedDate: row.authorCreatedAt ? new Date(row.authorCreatedAt).toISOString() : undefined,
            },
          };
        });

        databasePortfolios = dbPortfolios;
      }
    } catch {
      // Graceful fallback to dynamicPortfolios in-memory store
    }

    // Query real developer count from database
    try {
      const devRes = await pool.query(
        `SELECT COUNT(DISTINCT id) as count FROM public.profiles WHERE username != 'developer' AND username != 'guest'`
      );
      if (devRes.rows && devRes.rows.length > 0) {
        totalDevelopers = Number(devRes.rows[0].count) || 0;
      }
    } catch {
      const authorSet = new Set<string>();
      (databasePortfolios || dynamicPortfolios).forEach((p) => {
        if (p.author?.username && p.author.username !== "developer" && p.author.username !== "guest") {
          authorSet.add(p.author.username.toLowerCase());
        }
      });
      totalDevelopers = authorSet.size;
    }

    // Store in L1 cache if this was a default query
    if (isDefaultQuery && databasePortfolios) {
      setCachedPortfolios(databasePortfolios, totalDevelopers);
      cached = getCachedPortfolios();
    }

    if (databasePortfolios) {
      const etag = cached.etag || `W/"${databaseTotal}-${Date.now().toString(36)}"`;
      return NextResponse.json(
        {
          portfolios: databasePortfolios,
          totalDevelopers,
          developersCount: totalDevelopers,
          pagination: {
            total: databaseTotal,
            offset,
            limit,
            hasMore: offset + limit < databaseTotal,
          },
        },
        {
          status: 200,
          headers: {
            ETag: etag,
            "Cache-Control": currentProfileId
              ? "private, no-cache"
              : "public, s-maxage=30, stale-while-revalidate=120",
          },
        }
      );
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
          ETag: cached.etag || `W/"${total}-${Date.now().toString(36)}"`,
          "Cache-Control": currentProfileId
            ? "private, no-cache"
            : "public, s-maxage=30, stale-while-revalidate=120",
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
          detail: "Submission does not satisfy constraints (e.g. 200 characters min, 2 MB max image).",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const id = `${slug}-${Date.now().toString(36)}`;

    // Project-level GitHub verification: server-authoritative, derived from
    // the authenticated caller's own linked GitHub account. The browser
    // never supplies a trusted verification status here — only the
    // submitted githubUrl feeds this, and it's re-parsed/re-checked from
    // scratch regardless of any client-side preview the modal showed.
    // A verification failure (GitHub unavailable, no linked account,
    // private/malformed repo, rate limit) must never block publishing —
    // the badge is additive, not a submission requirement.
    const githubVerification = await verifyGithubProjectRelationship(actorId, data.githubUrl).catch(
      (): { status: null; reason: "unavailable" } => ({ status: null, reason: "unavailable" })
    );

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
      rating: 0,
      ratingCount: 0,
      ratingBreakdown: {
        design: 0,
        codeQuality: 0,
        performance: 0,
        documentation: 0,
      },
      requestCritique: Boolean(data.requestCritique),
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      isShowcase: false,
      githubVerification: githubVerification.status
        ? {
            status: githubVerification.status,
            login: githubVerification.githubLogin,
            repositoryFullName: githubVerification.repositoryFullName,
            verifiedAt: githubVerification.verifiedAt,
          }
        : undefined,
    };

    // Attempt PostgreSQL database persistence
    try {
      let authorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id FROM public.profiles 
         WHERE id::text = $1 
            OR LOWER(username) = LOWER($2) 
            OR LOWER(username) = LOWER($3) 
         LIMIT 1`,
        [authUser.id, authUser.username || "", body.authorUsername || ""]
      );

      if (profileCheck.rows && profileCheck.rows.length > 0) {
        authorProfileId = profileCheck.rows[0].id;
      } else {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUser.id);
        const targetUsername = authUser.username || body.authorUsername || `dev_${Date.now().toString(36)}`;
        const targetName = authUser.name || body.authorName || "Developer";
        const targetAvatar = authUser.avatar || body.authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";
        const targetRole = authUser.role || "developer";

        let insertProfile;
        if (isUuid) {
          insertProfile = await pool.query(
            `INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
             RETURNING id`,
            [authUser.id, targetUsername, targetName, targetAvatar, targetRole]
          );
        } else {
          insertProfile = await pool.query(
            `INSERT INTO public.profiles (username, full_name, avatar_url, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
             RETURNING id`,
            [targetUsername, targetName, targetAvatar, targetRole]
          );
        }
        if (insertProfile.rows && insertProfile.rows.length > 0) {
          authorProfileId = insertProfile.rows[0].id;
        }
      }

      if (authorProfileId) {
        await pool.query(
          `INSERT INTO public.portfolios (
            id, author_id, title, tagline, description, portfolio_url, github_url, demo_url,
            thumbnail_url, image_size_bytes, category, tech_stack, comments_count, is_showcase,
            status, request_critique, github_verification_status, github_verified_login,
            github_repository_full_name, github_verified_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::public.portfolio_category, $12, 0, false, 'published', $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO NOTHING`,
          [
            id,
            authorProfileId,
            data.title,
            data.tagline,
            data.description?.trim() || null,
            data.portfolioUrl,
            data.githubUrl,
            data.demoUrl || data.portfolioUrl,
            data.thumbnailUrl,
            data.imageSizeBytes || 1024 * 500,
            data.category,
            data.techStack,
            Boolean(data.requestCritique),
            githubVerification.status,
            githubVerification.status ? githubVerification.githubLogin : null,
            githubVerification.status ? githubVerification.repositoryFullName : null,
            githubVerification.status ? githubVerification.verifiedAt : null,
          ]
        );
      }
    } catch (dbErr) {
      console.error("[POST /api/portfolios] Database persist error:", dbErr);
    }

    const currentPortfolios = getDynamicPortfolios();
    currentPortfolios.unshift(newPortfolio);
    setDynamicPortfolios(currentPortfolios);
    invalidatePortfoliosCache();
    invalidateDevelopersCache();

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
