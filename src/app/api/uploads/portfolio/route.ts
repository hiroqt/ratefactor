import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import {
  createPortfolioUploadSignature,
  deletePortfolioAsset,
  getCloudinaryConfig,
  verifyUploadReceipt,
} from "@/lib/cloudinary";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { pool } from "@/lib/auth/better-auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  const rateCheck = checkRateLimit(`portfolio-upload:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  try {
    return NextResponse.json(createPortfolioUploadSignature(user.id));
  } catch {
    return NextResponse.json({ detail: "Portfolio image uploads are unavailable." }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  const { publicId, receipt } = await req.json().catch(() => ({}));
  let config;
  try {
    config = getCloudinaryConfig();
  } catch {
    return NextResponse.json({ detail: "Portfolio image uploads are unavailable." }, { status: 503 });
  }
  if (typeof publicId !== "string" || typeof receipt !== "string" ||
      !verifyUploadReceipt(receipt, user.id, publicId, Math.floor(Date.now() / 1000), config.secret)) {
    return NextResponse.json({ detail: "Invalid upload receipt." }, { status: 400 });
  }
  const referenced = await pool.query(
    "SELECT 1 FROM public.portfolios WHERE thumbnail_public_id = $1 LIMIT 1",
    [publicId]
  );
  if (referenced.rowCount) return NextResponse.json({ deleted: false, referenced: true });
  try {
    return NextResponse.json({ deleted: await deletePortfolioAsset(publicId) });
  } catch {
    return NextResponse.json({ deleted: false }, { status: 502 });
  }
}
