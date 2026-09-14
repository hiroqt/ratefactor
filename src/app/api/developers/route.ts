import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/auth/better-auth";
import { getDynamicPortfolios } from "@/lib/dynamic-portfolios";
import { DeveloperSummary } from "@/types/profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get("q") || searchParams.get("search") || "").trim();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));

    let developers: DeveloperSummary[] = [];
    let totalCount = 0;

    try {
      // 1. Query real registered users from PostgreSQL public.profiles table
      let baseSql = `
        SELECT 
          id,
          username,
          full_name as name,
          avatar_url as avatar,
          role,
          is_verified as "isVerified",
          created_at
        FROM public.profiles
        WHERE username IS NOT NULL 
          AND username != ''
          AND username NOT LIKE 'alpha_%'
          AND username NOT LIKE 'beta_%'
          AND username NOT LIKE 'gamma_%'
      `;
      const queryParams: any[] = [];

      if (searchQuery) {
        queryParams.push(`%${searchQuery}%`);
        baseSql += ` AND (username ILIKE $${queryParams.length} OR full_name ILIKE $${queryParams.length})`;
      }

      baseSql += `
        ORDER BY 
          CASE 
            WHEN avatar_url LIKE '%avatars.githubusercontent.com%' THEN 0
            WHEN avatar_url IS NOT NULL AND avatar_url != '' AND avatar_url NOT LIKE '%photo-1472099645785%' THEN 1
            ELSE 2 
          END,
          created_at DESC
        LIMIT $${queryParams.length + 1}
      `;
      queryParams.push(limit);

      const dbRes = await pool.query(baseSql, queryParams);

      // Real user count in database
      const countRes = await pool.query(
        `SELECT COUNT(DISTINCT id) as count 
         FROM public.profiles 
         WHERE username IS NOT NULL 
           AND username != '' 
           AND username NOT LIKE 'alpha_%'
           AND username NOT LIKE 'beta_%'
           AND username NOT LIKE 'gamma_%'`
      );
      totalCount = Number(countRes.rows[0]?.count) || 0;

      if (dbRes.rows && dbRes.rows.length > 0) {
        developers = dbRes.rows.map((row) => ({
          id: String(row.id),
          username: row.username,
          name: row.name || row.username,
          avatar: row.avatar || "",
          role: row.role || "developer",
          isVerified: Boolean(row.isVerified),
        }));
      }
    } catch {
      // If direct database query fails, extract unique real authors from dynamically submitted portfolios
      const dynamicPortfolios = getDynamicPortfolios();
      const seen = new Set<string>();

      dynamicPortfolios.forEach((p) => {
        if (p.author?.username && !seen.has(p.author.username.toLowerCase())) {
          seen.add(p.author.username.toLowerCase());
          if (
            !searchQuery ||
            p.author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.author.name?.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            developers.push({
              id: (p.author as any)?.id || `dev-${p.author.username}`,
              username: p.author.username,
              name: p.author.name || p.author.username,
              avatar: p.author.avatar || "",
              role: p.author.role || "developer",
              isVerified: p.author.isVerified,
            });
          }
        }
      });
      totalCount = developers.length;
    }

    return NextResponse.json(
      {
        developers,
        totalCount,
        query: searchQuery || null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        developers: [],
        totalCount: 0,
        error: error?.message || "Failed to search real developers",
      },
      { status: 500 }
    );
  }
}
