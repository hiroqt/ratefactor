import { NextRequest, NextResponse } from "next/server";
import { trackUptimeHeartbeat, checkSystemHealth, trackDowntimeIncident } from "@/lib/uptime";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for Uptime Monitoring (Better Stack, Pingdom, PostHog, etc.)
 * per ARD_PRD_Ratefactor.md Section 9.
 *
 * Emits heartbeat telemetry to PostHog on every check.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const simulate = searchParams.get("simulate");

  // Allow manual simulation of downtime for alert verification
  if (simulate === "downtime") {
    trackDowntimeIncident({
      service: "ratefactor-api-simulated",
      status: "down",
      reason: "Simulated downtime test for monitoring verification",
      statusCode: 503,
      severity: "critical",
      affectedEndpoints: ["/api/health"],
    });

    return NextResponse.json(
      {
        status: "down",
        error: "Simulated downtime test error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Perform full system check & dispatch PostHog heartbeat event
  const healthReport = await trackUptimeHeartbeat("health_check");

  const statusCode = healthReport.status === "down" ? 503 : 200;

  return NextResponse.json(
    {
      ...healthReport,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}
