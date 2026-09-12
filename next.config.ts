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

  // Sentry Webpack options
  webpack: {
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
    autoInstrumentAppDirectory: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
