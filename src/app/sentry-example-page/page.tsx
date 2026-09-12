"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { triggerServerActionError } from "./actions";
import { trackEvent } from "@/lib/analytics";

export default function SentryExamplePage() {
  const [hasError, setHasError] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [posthogStatus, setPosthogStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthData(data);
    } catch (e) {
      setHealthData({ status: "error", message: "Failed to fetch health check" });
    } finally {
      setLoadingHealth(false);
    }
  };

  const triggerClientError = () => {
    trackEvent("sentry_test_error_triggered", { type: "client_button" });
    throw new Error("Sentry Test Error — Triggered from Sentry Example Page button");
  };

  const triggerUndefinedFunction = () => {
    trackEvent("sentry_test_error_triggered", { type: "undefined_function" });
    try {
      // Call a function that does not exist in application scope
      // @ts-expect-error Intentionally invoking undefined function for test verification
      window.myUndefinedFunction();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };

  const handleServerActionError = async () => {
    try {
      setServerStatus("Executing server action...");
      await triggerServerActionError();
    } catch (err: any) {
      setServerStatus(`Captured server action error: ${err?.message || "Unknown error"}`);
    }
  };

  const triggerPostHogHeartbeat = async () => {
    trackEvent("uptime_heartbeat", {
      triggered_by: "manual_user_probe",
      page: "/sentry-example-page",
      timestamp: new Date().toISOString(),
    });
    setPosthogStatus("Heartbeat ping sent to PostHog!");
    setTimeout(() => setPosthogStatus(null), 3000);
  };

  const triggerPostHogDowntime = async () => {
    try {
      const res = await fetch("/api/monitoring/uptime?action=simulate-outage");
      const data = await res.json();
      setPosthogStatus(`Simulated outage logged: ${data.message}`);
      fetchHealth();
    } catch (e) {
      setPosthogStatus("Failed to simulate downtime");
    }
    setTimeout(() => setPosthogStatus(null), 4000);
  };

  if (hasError) {
    // Force a render error
    throw new Error("Sentry Render Error — Component threw during rendering");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3 mb-2">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              Sentry Next.js & PostHog Monitoring
            </span>
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Status: Active
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Telemetry & Observability Console
          </h1>
          <p className="text-slate-400 mt-2 text-base">
            Verify error capturing with Sentry and real-time uptime/downtime monitoring with PostHog.
          </p>
        </div>

        {/* Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Sentry Error Verification */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                ⚠️
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Sentry Error Tracing</h2>
                <p className="text-xs text-slate-400">Trigger test exceptions across runtimes</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={triggerClientError}
                className="w-full text-left px-4 py-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 rounded-lg transition text-sm font-medium text-rose-300 flex items-center justify-between"
              >
                <span>Trigger Client Test Error</span>
                <span className="text-xs font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                  throw Error()
                </span>
              </button>

              <button
                type="button"
                onClick={triggerUndefinedFunction}
                className="w-full text-left px-4 py-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30 rounded-lg transition text-sm font-medium text-amber-300 flex items-center justify-between"
              >
                <span>Call Undefined Function</span>
                <span className="text-xs font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  myUndefinedFunction()
                </span>
              </button>

              <button
                type="button"
                onClick={handleServerActionError}
                className="w-full text-left px-4 py-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded-lg transition text-sm font-medium text-purple-300 flex items-center justify-between"
              >
                <span>Trigger Server Action Error</span>
                <span className="text-xs font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                  Server Runtime
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHasError(true)}
                className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition text-sm font-medium text-slate-300 flex items-center justify-between"
              >
                <span>Trigger React Render Error</span>
                <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  Boundary Test
                </span>
              </button>
            </div>

            {serverStatus && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-purple-300 break-all">
                {serverStatus}
              </div>
            )}
          </div>

          {/* Card 2: PostHog Uptime & Downtime Monitoring */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                🦔
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">PostHog Uptime Telemetry</h2>
                <p className="text-xs text-slate-400">Heartbeats, downtime incidents, and latency</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={triggerPostHogHeartbeat}
                className="w-full text-left px-4 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded-lg transition text-sm font-medium text-emerald-300 flex items-center justify-between"
              >
                <span>Send Uptime Heartbeat</span>
                <span className="text-xs font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  uptime_heartbeat
                </span>
              </button>

              <button
                type="button"
                onClick={triggerPostHogDowntime}
                className="w-full text-left px-4 py-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 rounded-lg transition text-sm font-medium text-rose-300 flex items-center justify-between"
              >
                <span>Simulate Downtime Incident</span>
                <span className="text-xs font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                  downtime_incident
                </span>
              </button>

              <button
                type="button"
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="w-full text-left px-4 py-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 rounded-lg transition text-sm font-medium text-cyan-300 flex items-center justify-between"
              >
                <span>{loadingHealth ? "Querying Health..." : "Refresh System Health Report"}</span>
                <span className="text-xs font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  /api/health
                </span>
              </button>
            </div>

            {posthogStatus && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-emerald-300">
                {posthogStatus}
              </div>
            )}
          </div>
        </div>

        {/* Live System Health Diagnostic Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🩺</span> System Health & Monitoring Payload
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              GET /api/health
            </span>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-72">
            {healthData ? JSON.stringify(healthData, null, 2) : "Loading health report..."}
          </pre>
        </div>

        {/* Setup Reference Box */}
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-400 space-y-2">
          <h4 className="text-white font-semibold">Configured Runtimes & Integrations</h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
            <li>Browser runtime: <code className="text-violet-300">sentry.client.config.ts</code> with Session Replay & Tracing</li>
            <li>Server runtime: <code className="text-violet-300">sentry.server.config.ts</code> with Node exception capturing</li>
            <li>Edge runtime: <code className="text-violet-300">sentry.edge.config.ts</code> with Next.js edge hooks</li>
            <li>Instrumentation: <code className="text-violet-300">src/instrumentation.ts</code> with Next.js 15+ <code className="text-violet-300">onRequestError</code></li>
            <li>PostHog Uptime Monitor: <code className="text-emerald-300">src/lib/uptime.ts</code> emitting heartbeat & incident telemetry</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
