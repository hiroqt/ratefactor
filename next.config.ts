import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com", "avatars.githubusercontent.com"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "yhels",
  project: process.env.SENTRY_PROJECT || "javascript-nextjs-e0",
  silent: true,
  disableLogger: true,
});
