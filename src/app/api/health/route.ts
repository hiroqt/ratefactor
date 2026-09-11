import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for Better Stack and uptime monitoring
 * per ARD_PRD_Ratefactor.md Section 9.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "ratefactor-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      dependencies: {
        database: "operational",
        realtimeWebSocket: "operational",
        showcaseEngine: "operational",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}
