import { NextRequest, NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { deriveDeveloperAccolades } from "@/lib/accolades";
import { DeveloperProfile } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { pool } from "@/lib/auth/better-auth";
import { getDynamicPortfolios } from "@/lib/dynamic-portfolios";

type TechDomain = "Frontend" | "Backend" | "Database" | "Cloud" | "AI";

const DOMAIN_KEYWORDS: Record<TechDomain, string[]> = {
  Frontend: [
    "react", "next.js", "nextjs", "vue", "svelte", "angular", "tailwind",
    "css", "html", "javascript", "typescript", "framer-motion", "radix", "ui", "web",
  ],
  Backend: [
    "node", "node.js", "nodejs", "go", "golang", "rust", "python", "fastapi",
    "express", "nest", "grpc", "graphql", "rest", "c++", "c#", "java",
  ],
  Database: [
    "postgres", "postgresql", "supabase", "redis", "mongodb", "sqlite",
    "prisma", "drizzle", "clickhouse", "turso", "mysql", "sql",
  ],
  Cloud: [
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "vercel",
    "fly.io", "terraform", "ci/cd", "linux", "cloudflare",
  ],
  AI: [
    "ai", "ml", "pytorch", "tensorflow", "openai", "gemini", "langchain",
    "rag", "llm", "huggingface", "vector", "embedding", "onnx",
  ],
};

function classifySkillDomain(skill: string): TechDomain {
  const norm = skill.trim().toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [TechDomain, string[]][]) {
    if (keywords.some((kw) => norm.includes(kw) || kw.includes(norm))) {
      return domain;
    }
  }
  return "Frontend";
}

interface DomainMatrixEntry {
  domain: TechDomain;
  skills: string[];
  projectCount: number;
  percentage: number;
}

function buildTechStackDistribution(
  skills: string[],
  portfolios: Array<{ techStack?: string[] }>
): Record<TechDomain, DomainMatrixEntry> {
  const matrix: Record<TechDomain, DomainMatrixEntry> = {
    Frontend: { domain: "Frontend", skills: [], projectCount: 0, percentage: 0 },
    Backend: { domain: "Backend", skills: [], projectCount: 0, percentage: 0 },
    Database: { domain: "Database", skills: [], projectCount: 0, percentage: 0 },
    Cloud: { domain: "Cloud", skills: [], projectCount: 0, percentage: 0 },
    AI: { domain: "AI", skills: [], projectCount: 0, percentage: 0 },
  };

  for (const rawSkill of skills) {
    const trimmed = rawSkill.trim();
    if (!trimmed) continue;
    const domain = classifySkillDomain(trimmed);
    if (!matrix[domain].skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      matrix[domain].skills.push(trimmed);
    }
  }

  let totalUsages = 0;
  for (const p of portfolios) {
    for (const rawTech of p.techStack || []) {
      const domain = classifySkillDomain(rawTech);
      matrix[domain].projectCount++;
      totalUsages++;
    }
  }

  for (const domain of Object.keys(matrix) as TechDomain[]) {
    matrix[domain].percentage =
      totalUsages > 0 ? Math.round((matrix[domain].projectCount / totalUsages) * 100) : 0;
  }

  return matrix;
}

// In-memory profile storage keyed by userId or username
const userProfiles = new Map<string, DeveloperProfile>();
userProfiles.set("default", { ...INITIAL_DEVELOPER_PROFILE });

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const requestedUsername = searchParams.get("username")?.toLowerCase().trim();

    let profile: DeveloperProfile;
    let targetKey = "default";

    if (requestedUsername) {
      targetKey = requestedUsername;
      profile = userProfiles.get(requestedUsername) || {
        ...INITIAL_DEVELOPER_PROFILE,
        username: requestedUsername,
      };
    } else if (authUser) {
      targetKey = authUser.id;
      if (!userProfiles.has(targetKey)) {
        userProfiles.set(targetKey, {
          ...INITIAL_DEVELOPER_PROFILE,
          id: authUser.id,
          name: authUser.name || INITIAL_DEVELOPER_PROFILE.name,
          username: authUser.username || INITIAL_DEVELOPER_PROFILE.username,
          avatar: authUser.avatar || INITIAL_DEVELOPER_PROFILE.avatar,
        });
      }
      profile = userProfiles.get(targetKey)!;
    } else {
      profile = userProfiles.get("default") || { ...INITIAL_DEVELOPER_PROFILE };
    }

    // Attempt to query PostgreSQL database if connection is live
    try {
      if (requestedUsername) {
        const res = await pool.query(
          `SELECT id, full_name as name, username, avatar_url, bio, skills, available_for_hire, custom_hire_message, company, location, website, github, twitter, linkedin FROM profiles WHERE LOWER(username) = LOWER($1) LIMIT 1`,
          [requestedUsername]
        );
        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          profile = {
            ...profile,
            id: row.id || profile.id,
            name: row.name || profile.name,
            username: row.username || profile.username,
            avatar: row.avatar_url || profile.avatar,
            bio: row.bio ?? profile.bio,
            skills: Array.isArray(row.skills) ? row.skills : profile.skills,
            availableForHire: row.available_for_hire ?? profile.availableForHire,
            customHireMessage: row.custom_hire_message ?? profile.customHireMessage,
            company: row.company ?? profile.company,
            location: row.location ?? profile.location,
            website: row.website ?? profile.website,
            github: row.github ?? profile.github,
            twitter: row.twitter ?? profile.twitter,
            linkedin: row.linkedin ?? profile.linkedin,
          };
        }
      } else if (authUser?.id) {
        const res = await pool.query(
          `SELECT id, full_name as name, username, avatar_url, bio, skills, available_for_hire, custom_hire_message, company, location, website, github, twitter, linkedin FROM profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
          [authUser.id, authUser.username || ""]
        );
        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          profile = {
            ...profile,
            name: row.name || profile.name,
            username: row.username || profile.username,
            avatar: row.avatar_url || profile.avatar,
            bio: row.bio ?? profile.bio,
            skills: Array.isArray(row.skills) ? row.skills : profile.skills,
            availableForHire: row.available_for_hire ?? profile.availableForHire,
            customHireMessage: row.custom_hire_message ?? profile.customHireMessage,
            company: row.company ?? profile.company,
            location: row.location ?? profile.location,
            website: row.website ?? profile.website,
            github: row.github ?? profile.github,
            twitter: row.twitter ?? profile.twitter,
            linkedin: row.linkedin ?? profile.linkedin,
          };
        }
      }
    } catch {
      // Graceful fallback to in-memory store in dev/offline mode
    }

    // Query real dynamic portfolios belonging to this user for accolades and tech stack distribution
    const targetUser = (profile.username || "").toLowerCase().trim();
    let userPortfolios: Portfolio[] = [];

    try {
      if (profile.id && profile.id !== "user-default") {
        const pfRes = await pool.query(
          `SELECT 
             p.id, p.title, p.tagline, p.description, p.portfolio_url as "portfolioUrl",
             p.github_url as "githubUrl", p.demo_url as "demoUrl", p.thumbnail_url as "thumbnail",
             p.image_size_bytes as "imageSizeBytes", p.category, p.tech_stack as "techStack",
             p.rating, p.rating_count as "ratingCount", p.rating_design as "ratingDesign",
             p.rating_code_quality as "ratingCodeQuality", p.rating_performance as "ratingPerformance",
             p.rating_documentation as "ratingDocumentation", p.likes_count as "likesCount",
             p.comments_count as "commentsCount", p.is_showcase as "isShowcase",
             p.showcase_type as "showcaseType", p.showcase_reason as "showcaseReason",
             p.request_critique as "requestCritique", p.created_at as "createdAt"
           FROM public.portfolios p
           JOIN public.profiles pr ON p.author_id = pr.id
           WHERE pr.id::text = $1 OR LOWER(pr.username) = LOWER($2)
           ORDER BY p.created_at DESC`,
          [profile.id, targetUser]
        );
        if (pfRes.rows && pfRes.rows.length > 0) {
          userPortfolios = pfRes.rows.map((row) => ({
            ...row,
            rating: Number(row.rating) || 0,
            ratingCount: Number(row.ratingCount) || 0,
            ratingBreakdown: {
              design: Number(row.ratingDesign) || 0,
              codeQuality: Number(row.ratingCodeQuality) || 0,
              performance: Number(row.ratingPerformance) || 0,
              documentation: Number(row.ratingDocumentation) || 0,
            },
            likesCount: Number(row.likesCount) || 0,
            commentsCount: Number(row.commentsCount) || 0,
            comments: [],
            author: {
              name: profile.name,
              username: profile.username,
              avatar: profile.avatar,
              role: profile.role,
              isVerified: profile.isVerified ?? false,
              availableForHire: profile.availableForHire ?? true,
            },
          }));
        }
      }
    } catch {}

    // In-memory dynamicPortfolios fallback
    if (userPortfolios.length === 0 && targetUser) {
      userPortfolios = getDynamicPortfolios().filter((p) => {
        const pAuthor = (p.author?.username || "").toLowerCase().trim();
        return pAuthor === targetUser;
      });
    }

    const accolades = deriveDeveloperAccolades(userPortfolios);
    const techStackDistribution = buildTechStackDistribution(profile.skills || [], userPortfolios);

    const fullProfile = {
      ...profile,
      accolades,
    };

    return NextResponse.json({
      profile: fullProfile,
      ...fullProfile,
      accolades,
      techStackDistribution,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to fetch developer profile.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to update your developer profile.",
          requiresAuth: true,
        },
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    // Rate limitation: Max 30 profile updates per minute
    const rateCheck = checkRateLimit(`profile_update:${authUser.id}:${ip}`, {
      limit: 30,
      windowSeconds: 60,
      debounceSeconds: 1,
    });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid JSON Body",
          status: 400,
          detail: "Request body contains invalid or malformed JSON.",
          invalidParams: [{ name: "body", reason: "Invalid JSON format" }],
        },
        {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      const invalidParams = issues.map((issue) => ({
        name: issue.path.join(".") || "unknown",
        reason: issue.message,
      }));

      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Profile Validation Failed",
          status: 400,
          detail: issues[0]?.message || "Validation failed for developer profile update.",
          invalidParams,
          errors: parseResult.error.flatten().fieldErrors,
        },
        {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    const data = parseResult.data;
    const targetKey = authUser.id;
    const current =
      userProfiles.get(targetKey) || userProfiles.get("default") || { ...INITIAL_DEVELOPER_PROFILE };

    const updated: DeveloperProfile = {
      ...current,
      id: authUser.id,
      name: data.name !== undefined ? data.name : current.name,
      bio: data.bio !== undefined ? (data.bio ?? "") : current.bio,
      skills: data.skills !== undefined ? data.skills : current.skills,
      availableForHire:
        data.availableForHire !== undefined ? data.availableForHire : current.availableForHire,
      customHireMessage:
        data.customHireMessage !== undefined
          ? (data.customHireMessage ?? "")
          : current.customHireMessage,
      company: data.company !== undefined ? (data.company ?? "") : current.company,
      location: data.location !== undefined ? (data.location ?? "") : current.location,
      website: data.website !== undefined ? (data.website ?? "") : current.website,
      github: data.github !== undefined ? (data.github ?? "") : current.github,
      twitter: data.twitter !== undefined ? (data.twitter ?? "") : current.twitter,
      linkedin: data.linkedin !== undefined ? (data.linkedin ?? "") : current.linkedin,
    };

    userProfiles.set(targetKey, updated);
    if (updated.username) {
      userProfiles.set(updated.username.toLowerCase().replace(/^@/, ""), updated);
    }
    userProfiles.set("default", updated);

    // Optional PostgreSQL database persistence
    try {
      const setClauses: string[] = ["updated_at = NOW()"];
      const values: any[] = [];
      let paramIdx = 1;

      if (data.name !== undefined) {
        setClauses.push(`full_name = $${paramIdx++}`);
        values.push(data.name);
      }
      if (data.bio !== undefined) {
        setClauses.push(`bio = $${paramIdx++}`);
        values.push(data.bio);
      }
      if (data.skills !== undefined) {
        setClauses.push(`skills = $${paramIdx++}`);
        values.push(data.skills);
      }
      if (data.availableForHire !== undefined) {
        setClauses.push(`available_for_hire = $${paramIdx++}`);
        values.push(data.availableForHire);
      }
      if (data.customHireMessage !== undefined) {
        setClauses.push(`custom_hire_message = $${paramIdx++}`);
        values.push(data.customHireMessage);
      }
      if (data.company !== undefined) {
        setClauses.push(`company = $${paramIdx++}`);
        values.push(data.company);
      }
      if (data.location !== undefined) {
        setClauses.push(`location = $${paramIdx++}`);
        values.push(data.location);
      }
      if (data.website !== undefined) {
        setClauses.push(`website = $${paramIdx++}`);
        values.push(data.website);
      }
      if (data.github !== undefined) {
        setClauses.push(`github = $${paramIdx++}`);
        values.push(data.github);
      }
      if (data.twitter !== undefined) {
        setClauses.push(`twitter = $${paramIdx++}`);
        values.push(data.twitter);
      }
      if (data.linkedin !== undefined) {
        setClauses.push(`linkedin = $${paramIdx++}`);
        values.push(data.linkedin);
      }

      if (setClauses.length > 1) {
        values.push(authUser.id);
        const query = `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`;
        await pool.query(query, values);
      }
    } catch {
      // Graceful fallback if database connection is offline
    }

    const targetUser = (updated.username || "").toLowerCase().trim();
    let userPortfolios: Portfolio[] = [];
    try {
      if (updated.id && updated.id !== "user-default") {
        const pfRes = await pool.query(
          `SELECT 
             p.id, p.title, p.tagline, p.description, p.portfolio_url as "portfolioUrl",
             p.github_url as "githubUrl", p.demo_url as "demoUrl", p.thumbnail_url as "thumbnail",
             p.image_size_bytes as "imageSizeBytes", p.category, p.tech_stack as "techStack",
             p.rating, p.rating_count as "ratingCount", p.rating_design as "ratingDesign",
             p.rating_code_quality as "ratingCodeQuality", p.rating_performance as "ratingPerformance",
             p.rating_documentation as "ratingDocumentation", p.likes_count as "likesCount",
             p.comments_count as "commentsCount", p.is_showcase as "isShowcase",
             p.showcase_type as "showcaseType", p.showcase_reason as "showcaseReason",
             p.request_critique as "requestCritique", p.created_at as "createdAt"
           FROM public.portfolios p
           JOIN public.profiles pr ON p.author_id = pr.id
           WHERE pr.id::text = $1 OR LOWER(pr.username) = LOWER($2)
           ORDER BY p.created_at DESC`,
          [updated.id, targetUser]
        );
        if (pfRes.rows && pfRes.rows.length > 0) {
          userPortfolios = pfRes.rows.map((row) => ({
            ...row,
            rating: Number(row.rating) || 0,
            ratingCount: Number(row.ratingCount) || 0,
            ratingBreakdown: {
              design: Number(row.ratingDesign) || 0,
              codeQuality: Number(row.ratingCodeQuality) || 0,
              performance: Number(row.ratingPerformance) || 0,
              documentation: Number(row.ratingDocumentation) || 0,
            },
            likesCount: Number(row.likesCount) || 0,
            commentsCount: Number(row.commentsCount) || 0,
            comments: [],
            author: {
              name: updated.name,
              username: updated.username,
              avatar: updated.avatar,
              role: updated.role,
              isVerified: updated.isVerified ?? false,
              availableForHire: updated.availableForHire ?? true,
            },
          }));
        }
      }
    } catch {}

    if (userPortfolios.length === 0 && targetUser) {
      userPortfolios = getDynamicPortfolios().filter((p) => {
        const pAuthor = (p.author?.username || "").toLowerCase().trim();
        return pAuthor === targetUser;
      });
    }

    const accolades = deriveDeveloperAccolades(userPortfolios);

    const fullProfile = {
      ...updated,
      accolades,
    };

    return NextResponse.json({
      message: "Profile updated successfully.",
      profile: fullProfile,
      ...fullProfile,
      accolades,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to update profile.",
      },
      { status: 500 }
    );
  }
}
