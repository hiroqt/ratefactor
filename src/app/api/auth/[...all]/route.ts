import { auth } from "@/lib/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";
import { handleOtpRequest, handleOtpVerify } from "@/lib/auth/otp-handlers";

const betterAuthHandlers = toNextJsHandler(auth);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest | Request) {
  const url = new URL(req.url);
  if (url.pathname === "/api/auth/otp/request" || url.pathname.endsWith("/otp/request")) {
    return handleOtpRequest(req as NextRequest);
  }
  if (url.pathname === "/api/auth/otp/verify" || url.pathname.endsWith("/otp/verify")) {
    return handleOtpVerify(req as NextRequest);
  }
  return betterAuthHandlers.POST(req as any);
}

export const { GET, PATCH, PUT, DELETE } = betterAuthHandlers;
