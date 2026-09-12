import { NextRequest, NextResponse } from "next/server";
import { trackUptimeHeartbeat, checkSystemHealth, trackDowntimeIncident } from "@/lib/uptime";
import { captureServerEvent } from "@/lib/posthog";

export const dynamic = "force-dynamic";

/**
 * Detailed Uptime & Downtime Monitoring API
 * Accepts GET for status & heartbeat, and POST for reporting downtime incidents or custom health pings.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "simulate-outage") {
    trackDowntimeIncident({
      service: "database-cluster",
      status: "down",
      reason: "Simulated database connection outage",
      severity: "critical",
      affectedEndpoints: ["/api/portfolios", "/api/auth"],
    });

    return NextResponse.json({
      status: "incident_logged",
      message: "Simulated downtime incident sent to PostHog and Sentry",
    });
  }

  const report = await trackUptimeHeartbeat("health_check");

  return NextResponse.json(report, {
    status: report.status === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, service, reason, severity, status } = body;

    if (event === "downtime_incident") {
      trackDowntimeIncident({
        service: service || "unknown-service",
        status: status || "down",
        reason: reason || "Unspecified downtime reported",
        severity: severity || "high",
      });

      return NextResponse.json({ success: true, logged: "downtime_incident" });
    }

    // Custom heartbeat
    captureServerEvent("uptime_custom_ping", "external_probe", body);
    return NextResponse.json({ success: true, logged: "uptime_custom_ping" });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid payload for uptime monitoring" },
      { status: 400 }
    );
  }
}
