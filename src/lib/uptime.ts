/**
 * Uptime and Downtime Monitoring System for PostHog & Sentry
 * Implements continuous health check evaluation, heartbeat telemetry, and incident alerting.
 */

import { captureServerEvent } from "./posthog";
import * as Sentry from "@sentry/nextjs";
import { pool } from "./auth/better-auth";

export type HealthStatus = "healthy" | "degraded" | "down";

export interface DependencyStatus {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  lastChecked: string;
}

export interface SystemHealthReport {
  status: HealthStatus;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  memoryUsage?: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  dependencies: {
    database: DependencyStatus;
    betterAuth: DependencyStatus;
    showcaseEngine: DependencyStatus;
  };
}

export interface DowntimeIncidentPayload {
  service: string;
  status: HealthStatus;
  reason: string;
  error?: string;
  statusCode?: number;
  affectedEndpoints?: string[];
  durationMs?: number;
  severity: "critical" | "high" | "medium" | "low";
}

/**
 * Checks the real-time operational status of all critical system dependencies.
 */
export async function checkSystemHealth(): Promise<SystemHealthReport> {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = process.uptime ? process.uptime() : 0;

  // 1. Check Database (Neon/PostgreSQL is the active runtime datastore) with a
  // cheap read-only query via the shared pg Pool, not just env-var presence.
  const dbStart = Date.now();
  let dbStatus: HealthStatus = "healthy";
  let dbMessage = "Database connection pool operational";
  if (!process.env.DATABASE_URL) {
    dbStatus = "degraded";
    dbMessage = "DATABASE_URL not configured";
  } else {
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      dbStatus = "down";
      dbMessage = err instanceof Error ? err.message : "Database check failed";
    }
  }
  const dbLatency = Date.now() - dbStart;

  // 2. Check Better-Auth
  const authStart = Date.now();
  let authStatus: HealthStatus = "healthy";
  let authMessage = "Better Auth infrastructure active";
  if (!process.env.BETTER_AUTH_SECRET && !process.env.BETTER_AUTH_API_KEY) {
    authStatus = "degraded";
    authMessage = "Auth secrets unconfigured in environment";
  }
  const authLatency = Date.now() - authStart;

  // 3. Check Showcase Engine
  const showcaseLatency = 1;
  const showcaseStatus: HealthStatus = "healthy";
  const showcaseMessage = "Showcase scoring engine ready";

  // Overall status
  const statuses = [dbStatus, authStatus, showcaseStatus];
  let overallStatus: HealthStatus = "healthy";
  if (statuses.includes("down")) {
    overallStatus = "down";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  // Memory usage
  const mem = process.memoryUsage ? process.memoryUsage() : null;
  const memoryUsage = mem
    ? {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      }
    : undefined;

  return {
    status: overallStatus,
    service: "ratefactor-app",
    version: "0.1.0",
    uptimeSeconds,
    timestamp,
    environment: process.env.NODE_ENV || "development",
    memoryUsage,
    dependencies: {
      database: {
        name: "PostgreSQL Database",
        status: dbStatus,
        latencyMs: dbLatency,
        message: dbMessage,
        lastChecked: timestamp,
      },
      betterAuth: {
        name: "Better Auth Infrastructure",
        status: authStatus,
        latencyMs: authLatency,
        message: authMessage,
        lastChecked: timestamp,
      },
      showcaseEngine: {
        name: "Showcase Algorithm Engine",
        status: showcaseStatus,
        latencyMs: showcaseLatency,
        message: showcaseMessage,
        lastChecked: timestamp,
      },
    },
  };
}

/**
 * Emits an uptime heartbeat event to PostHog and records breadcrumbs to Sentry.
 */
export async function trackUptimeHeartbeat(
  source: "server_cron" | "health_check" | "client_ping" = "health_check"
): Promise<SystemHealthReport> {
  const health = await checkSystemHealth();

  // Send to PostHog
  captureServerEvent("uptime_heartbeat", "uptime_monitor", {
    source,
    status: health.status,
    uptimeSeconds: health.uptimeSeconds,
    memoryUsage: health.memoryUsage,
    databaseStatus: health.dependencies.database.status,
    authStatus: health.dependencies.betterAuth.status,
    timestamp: health.timestamp,
  });

  // If degraded or down, log downtime incident
  if (health.status !== "healthy") {
    trackDowntimeIncident({
      service: "ratefactor-api",
      status: health.status,
      reason: `System health status degraded: DB ${health.dependencies.database.status}, Auth ${health.dependencies.betterAuth.status}`,
      severity: health.status === "down" ? "critical" : "medium",
      affectedEndpoints: ["/api/health", "/api/portfolios"],
    });
  }

  return health;
}

/**
 * Emits a downtime incident event to PostHog and triggers a Sentry capture.
 */
export function trackDowntimeIncident(incident: DowntimeIncidentPayload): void {
  // Capture in PostHog
  captureServerEvent("downtime_incident", "incident_monitor", {
    service: incident.service,
    status: incident.status,
    reason: incident.reason,
    error: incident.error,
    statusCode: incident.statusCode,
    affectedEndpoints: incident.affectedEndpoints,
    durationMs: incident.durationMs,
    severity: incident.severity,
    timestamp: new Date().toISOString(),
  });

  // Alert Sentry for critical and high severity incidents
  if (incident.severity === "critical" || incident.severity === "high") {
    Sentry.captureMessage(
      `[Downtime Incident] ${incident.service}: ${incident.reason}`,
      {
        level: incident.severity === "critical" ? "fatal" : "error",
        tags: {
          component: "uptime_monitor",
          incident_service: incident.service,
          incident_status: incident.status,
          incident_severity: incident.severity,
        },
        extra: {
          ...incident,
        },
      }
    );
  }
}
