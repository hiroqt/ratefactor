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
          `SELECT 
             p.id, p.full_name as name, p.username, p.avatar_url, p.role, p.onboarded, 
             p.bio, p.skills, p.available_for_hire, p.custom_hire_message, 
             p.company, p.location, p.website, p.github, p.twitter, p.linkedin,
             COALESCE(p.created_at, u."createdAt") as created_at
           FROM profiles p
           LEFT JOIN public."user" u ON (p.id = md5('ratefactor:' || u.id)::uuid OR p.id::text = u.id OR LOWER(p.username) = LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9_-]', '', 'g')))
           WHERE LOWER(p.username) = LOWER($1)
           LIMIT 1`,
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
            role: row.role || profile.role || "user",
            onboarded: row.onboarded ?? profile.onboarded ?? true,
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
            joinedDate: row.created_at ? new Date(row.created_at).toISOString() : profile.joinedDate,
          };
          userProfiles.set(requestedUsername.toLowerCase(), profile);
        } else {
          // Direct fallback to Better Auth user table
          const uRes = await pool.query(
            `SELECT id, name, email, image as avatar_url, role, "createdAt" as created_at 
             FROM public."user" 
             WHERE LOWER(name) = LOWER($1) OR LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9_-]', '', 'g')) = LOWER($1) 
             LIMIT 1`,
            [requestedUsername]
          );
          if (uRes.rows && uRes.rows.length > 0) {
            const uRow = uRes.rows[0];
            profile = {
              ...profile,
              id: uRow.id || profile.id,
              name: uRow.name || profile.name,
              avatar: uRow.avatar_url || profile.avatar,
              role: uRow.role || profile.role,
              joinedDate: uRow.created_at ? new Date(uRow.created_at).toISOString() : profile.joinedDate,
            };
            userProfiles.set(requestedUsername.toLowerCase(), profile);
          }
        }
      } else if (authUser?.id) {
        const res = await pool.query(
          `SELECT 
             p.id, COALESCE(NULLIF(p.full_name, ''), u.name) as name, p.username, COALESCE(NULLIF(p.avatar_url, ''), u.image) as avatar_url, p.role, p.onboarded, 
             p.bio, p.skills, p.available_for_hire, p.custom_hire_message, 
             p.company, p.location, p.website, p.github, p.twitter, p.linkedin,
             COALESCE(p.created_at, u."createdAt") as created_at
           FROM profiles p
           LEFT JOIN public."user" u ON (p.id = md5('ratefactor:' || u.id)::uuid OR p.id::text = u.id OR LOWER(p.username) = LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9_-]', '', 'g')))
           WHERE p.id = md5('ratefactor:' || $1)::uuid 
              OR p.id::text = $1 
              OR ($2 != '' AND LOWER(p.username) = LOWER($2))
           LIMIT 1`,
          [authUser.id, authUser.username || ""]
        );
        if (res.rows && res.rows.length > 0) {
          const row = res.rows[0];
          const isExistingUser = Boolean(
            row.onboarded === true ||
            (row.created_at && (Date.now() - new Date(row.created_at).getTime()) > 10 * 60 * 1000) ||
            (row.bio && row.bio.trim().length > 0) ||
            (row.role && row.role !== "user")
          );

          if (isExistingUser && row.onboarded === false) {
            pool.query('UPDATE public.profiles SET onboarded = TRUE WHERE id = $1', [row.id]).catch(() => {});
            pool.query('UPDATE public."user" SET onboarded = TRUE WHERE id = $1', [authUser.id]).catch(() => {});
          }

          profile = {
            ...profile,
            id: row.id || profile.id,
            name: row.name || profile.name,
            username: row.username || profile.username,
            avatar: row.avatar_url || profile.avatar,
            role: row.role || profile.role || "user",
            onboarded: isExistingUser ? true : (row.onboarded ?? false),
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
            joinedDate: row.created_at
              ? new Date(row.created_at).toISOString()
              : (authUser.createdAt || profile.joinedDate),
          };
          userProfiles.set(authUser.id, profile);
          if (profile.username) {
            userProfiles.set(profile.username.toLowerCase(), profile);
          }
        } else {
          // Direct fallback to Better Auth user table
          const uRes = await pool.query(
            `SELECT id, name, email, image as avatar_url, role, "createdAt" as created_at, onboarded 
             FROM public."user" 
             WHERE id = $1 
             LIMIT 1`,
            [authUser.id]
          );
          if (uRes.rows && uRes.rows.length > 0) {
            const uRow = uRes.rows[0];
            profile = {
              ...profile,
              id: uRow.id || profile.id,
              name: uRow.name || profile.name,
              avatar: uRow.avatar_url || profile.avatar,
              role: uRow.role || profile.role || "user",
              onboarded: uRow.onboarded ?? profile.onboarded ?? true,
              joinedDate: uRow.created_at ? new Date(uRow.created_at).toISOString() : (authUser.createdAt || profile.joinedDate),
            };
            userProfiles.set(authUser.id, profile);
            if (profile.username) {
              userProfiles.set(profile.username.toLowerCase(), profile);
            }
          } else if (authUser.createdAt) {
            profile = {
              ...profile,
              joinedDate: new Date(authUser.createdAt).toISOString(),
            };
          }
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
           WHERE pr.id = md5('ratefactor:' || $1)::uuid 
              OR pr.id::text = $1 
              OR LOWER(pr.username) = LOWER($2)
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
    let current =
      userProfiles.get(targetKey) || userProfiles.get("default") || { ...INITIAL_DEVELOPER_PROFILE };

    // 1. Fetch current profile from PostgreSQL so we have the authentic database record
    let profileRow: any = null;
    try {
      const pRes = await pool.query(
        `SELECT id, username, full_name as name, avatar_url as avatar, role, onboarded, 
                bio, skills, available_for_hire, custom_hire_message, company, location, 
                website, github, twitter, linkedin, created_at
         FROM public.profiles
         WHERE id = md5('ratefactor:' || $1)::uuid
            OR id::text = $1
            OR LOWER(username) = LOWER($2)
         LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );
      if (pRes.rows && pRes.rows.length > 0) {
        profileRow = pRes.rows[0];
        current = {
          ...current,
          id: authUser.id,
          name: profileRow.name || current.name,
          username: profileRow.username || current.username,
          avatar: profileRow.avatar || current.avatar,
          role: profileRow.role || current.role,
          onboarded: profileRow.onboarded ?? current.onboarded,
          bio: profileRow.bio ?? current.bio,
          skills: Array.isArray(profileRow.skills) ? profileRow.skills : current.skills,
          availableForHire: profileRow.available_for_hire ?? current.availableForHire,
          customHireMessage: profileRow.custom_hire_message ?? current.customHireMessage,
          company: profileRow.company ?? current.company,
          location: profileRow.location ?? current.location,
          website: profileRow.website ?? current.website,
          github: profileRow.github ?? current.github,
          twitter: profileRow.twitter ?? current.twitter,
          linkedin: profileRow.linkedin ?? current.linkedin,
          joinedDate: profileRow.created_at ? new Date(profileRow.created_at).toISOString() : current.joinedDate,
        };
      }
    } catch {}

    const currentUsername = (profileRow?.username || authUser.username || current.username || "").toLowerCase().trim();
    const cleanUsername = data.username ? data.username.toLowerCase().replace(/^@/, "").trim() : undefined;

    // A username conflict check is ONLY needed if:
    // 1. The user explicitly requested a non-empty username, AND
    // 2. That requested username is DIFFERENT from the user's current username in DB/session.
    // If the user is only updating their name, bio, etc., and keeping their existing username,
    // they OWN that username and it must never be flagged as "already taken"!
    const isUsernameChanging = Boolean(
      cleanUsername &&
      currentUsername &&
      cleanUsername !== currentUsername
    );

    if (isUsernameChanging && cleanUsername) {
      try {
        const conflictRes = await pool.query(
          `SELECT id, username FROM public.profiles 
           WHERE LOWER(username) = LOWER($1) 
             AND id != md5('ratefactor:' || $2)::uuid 
             AND id::text != $2 
           LIMIT 1`,
          [cleanUsername, authUser.id]
        );
        if (conflictRes.rows && conflictRes.rows.length > 0) {
          return NextResponse.json(
            {
              type: "https://ratefactor.dev/errors/username-taken",
              title: "Username Taken",
              status: 409,
              detail: `The username @${cleanUsername} is already taken. Please choose another username.`,
              invalidParams: [{ name: "username", reason: "Username already taken" }],
            },
            {
              status: 409,
              headers: { "Content-Type": "application/problem+json" },
            }
          );
        }
      } catch {
        // Fallback if DB offline
      }
    }

    const safeName = data.name !== undefined
      ? (data.name && data.name.trim() ? data.name.trim() : (cleanUsername || current.name || "User"))
      : current.name;

    const updated: DeveloperProfile = {
      ...current,
      id: authUser.id,
      name: safeName,
      username: cleanUsername !== undefined ? cleanUsername : current.username,
      role: data.role !== undefined ? data.role : (current.role || "user"),
      avatar: data.avatar !== undefined ? data.avatar : current.avatar,
      onboarded: data.onboarded !== undefined ? data.onboarded : (current.onboarded ?? true),
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
      joinedDate:
        current.joinedDate && current.joinedDate !== "2026"
          ? current.joinedDate
          : (authUser.createdAt || current.joinedDate || new Date().toISOString()),
    };

    userProfiles.set(targetKey, updated);
    if (updated.username) {
      userProfiles.set(updated.username.toLowerCase().replace(/^@/, ""), updated);
    }
    if (authUser.username) {
      userProfiles.set(authUser.username.toLowerCase().replace(/^@/, ""), updated);
    }

    // PostgreSQL database persistence
    try {
      const setClauses: string[] = ["updated_at = NOW()"];
      const values: any[] = [];
      let paramIdx = 1;

      if (data.name !== undefined) {
        setClauses.push(`full_name = $${paramIdx++}`);
        values.push(safeName);
      }
      if (cleanUsername !== undefined) {
        setClauses.push(`username = $${paramIdx++}`);
        values.push(cleanUsername);
      }
      if (data.role !== undefined) {
        setClauses.push(`role = $${paramIdx++}`);
        values.push(data.role);
      }
      if (data.avatar !== undefined) {
        setClauses.push(`avatar_url = $${paramIdx++}`);
        values.push(data.avatar);
      }
      if (data.onboarded !== undefined) {
        setClauses.push(`onboarded = $${paramIdx++}`);
        values.push(data.onboarded);
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
        const authIdParam = paramIdx++;
        values.push(authUser.id);
        const curUserParam = paramIdx++;
        values.push(currentUsername || "");

        const updateQuery = `UPDATE public.profiles SET ${setClauses.join(", ")} 
          WHERE id = md5('ratefactor:' || $${authIdParam})::uuid 
             OR id::text = $${authIdParam} 
             OR ($${curUserParam} != '' AND LOWER(username) = LOWER($${curUserParam}))`;
        const updateResult = await pool.query(updateQuery, values);

        if (!updateResult.rowCount || updateResult.rowCount === 0) {
          const insertId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUser.id)
            ? authUser.id
            : null;
          await pool.query(
            `INSERT INTO public.profiles (
              id, username, full_name, avatar_url, role, onboarded, bio, skills, available_for_hire, custom_hire_message, company, location, website, github, twitter, linkedin
            ) VALUES (
              COALESCE($1::uuid, md5('ratefactor:' || $2)::uuid),
              $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) ON CONFLICT (id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              username = EXCLUDED.username,
              role = EXCLUDED.role,
              avatar_url = EXCLUDED.avatar_url,
              onboarded = EXCLUDED.onboarded,
              bio = EXCLUDED.bio,
              skills = EXCLUDED.skills,
              available_for_hire = EXCLUDED.available_for_hire,
              custom_hire_message = EXCLUDED.custom_hire_message,
              company = EXCLUDED.company,
              location = EXCLUDED.location,
              website = EXCLUDED.website,
              github = EXCLUDED.github,
              twitter = EXCLUDED.twitter,
              linkedin = EXCLUDED.linkedin`,
            [
              insertId,
              authUser.id,
              cleanUsername || current.username || `user_${authUser.id.slice(0, 6)}`,
              safeName,
              updated.avatar || "",
              updated.role || "user",
              updated.onboarded ?? true,
              updated.bio || "",
              updated.skills || [],
              updated.availableForHire ?? true,
              updated.customHireMessage || null,
              updated.company || "",
              updated.location || "",
              updated.website || "",
              updated.github || "",
              updated.twitter || "",
              updated.linkedin || "",
            ]
          );
        }
      }

      // Sync changes to Better Auth public."user" table
      const userSetClauses: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
      const userValues: any[] = [];
      let uIdx = 1;
      if (data.name !== undefined) {
        userSetClauses.push(`"name" = $${uIdx++}`);
        userValues.push(safeName);
      }
      if (data.avatar !== undefined) {
        userSetClauses.push(`"image" = $${uIdx++}`);
        userValues.push(data.avatar);
      }
      if (data.role !== undefined) {
        userSetClauses.push(`"role" = $${uIdx++}`);
        userValues.push(data.role);
      }
      if (data.onboarded !== undefined) {
        userSetClauses.push(`"onboarded" = $${uIdx++}`);
        userValues.push(data.onboarded);
      }
      if (userSetClauses.length > 1) {
        userValues.push(authUser.id);
        await pool.query(
          `UPDATE public."user" SET ${userSetClauses.join(", ")} WHERE "id" = $${uIdx}`,
          userValues
        );
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
            WHERE pr.id = md5('ratefactor:' || $1)::uuid 
               OR pr.id::text = $1 
               OR LOWER(pr.username) = LOWER($2)
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
