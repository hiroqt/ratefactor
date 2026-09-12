import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project settings
  org: process.env.SENTRY_ORG || "yhels",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs-e0",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Treeshake debug logging
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
