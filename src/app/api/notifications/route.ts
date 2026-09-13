import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { pool } from "@/lib/auth/better-auth";
import { NotificationItem } from "@/types/portfolio";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser(req);
    if (!authUser) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0 },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Resolve recipient profile ID
    let recipientProfileId: string | null = null;
    const profileCheck = await pool.query(
      `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
      [authUser.id, authUser.username || ""]
    );
    if (profileCheck.rows && profileCheck.rows.length > 0) {
      recipientProfileId = profileCheck.rows[0].id;
    }

    if (!recipientProfileId) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0 },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // Query notifications joined with actor profiles
    const notifsRes = await pool.query(
      `SELECT 
         n.id,
         n.type,
         n.portfolio_id as "portfolioId",
         n.portfolio_title as "portfolioTitle",
         n.message,
         n.rating_score as "ratingScore",
         n.is_read as "isRead",
         n.created_at as "timestamp",
         COALESCE(pr.full_name, 'Developer') as "actorName",
         COALESCE(pr.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80') as "actorAvatar"
       FROM public.notifications n
       LEFT JOIN public.profiles pr ON n.actor_id = pr.id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [recipientProfileId]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM public.notifications WHERE recipient_id = $1 AND is_read = false`,
      [recipientProfileId]
    );
    const unreadCount = countRes.rows[0]?.count ?? 0;

    const notifications: NotificationItem[] = notifsRes.rows.map((row) => ({
      id: String(row.id),
      type: row.type as NotificationItem["type"],
      actorName: row.actorName,
      actorAvatar: row.actorAvatar,
      portfolioId: row.portfolioId || "",
      portfolioTitle: row.portfolioTitle || "Portfolio",
      message: row.message || "",
      ratingScore: row.ratingScore ? Number(row.ratingScore) : undefined,
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      isRead: Boolean(row.isRead),
    }));

    return NextResponse.json(
      { notifications, unreadCount },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to fetch notifications.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getSessionUser(req);
    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in to manage notifications.",
        },
        { status: 401 }
      );
    }

    let recipientProfileId: string | null = null;
    const profileCheck = await pool.query(
      `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
      [authUser.id, authUser.username || ""]
    );
    if (profileCheck.rows && profileCheck.rows.length > 0) {
      recipientProfileId = profileCheck.rows[0].id;
    }

    if (!recipientProfileId) {
      return NextResponse.json({ success: true, unreadCount: 0 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.all) {
      await pool.query(
        `UPDATE public.notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
        [recipientProfileId]
      );
    } else if (body.id) {
      await pool.query(
        `UPDATE public.notifications SET is_read = true WHERE id::text = $1 AND recipient_id = $2`,
        [body.id, recipientProfileId]
      );
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM public.notifications WHERE recipient_id = $1 AND is_read = false`,
      [recipientProfileId]
    );
    const unreadCount = countRes.rows[0]?.count ?? 0;

    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to update notification status.",
      },
      { status: 500 }
    );
  }
}
