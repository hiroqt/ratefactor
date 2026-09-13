import { betterAuth } from "better-auth";
import { dash, sentinel } from "@better-auth/infra";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/ratefactor";

const isProduction = process.env.NODE_ENV === "production";
const useSsl =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes("sslmode=require") ||
  (isProduction && !connectionString.includes("localhost"));

// Reuse pg Pool across Next.js HMR reloads in development
const globalForAuth = globalThis as unknown as {
  betterAuthPool?: Pool;
};

export const pool =
  globalForAuth.betterAuthPool ||
  new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });

// Handle idle connection errors gracefully without crashing the Node process
pool.on("error", (err) => {
  console.warn("[Better Auth pg Pool]:", err?.message || err);
});

if (process.env.NODE_ENV !== "production") {
  globalForAuth.betterAuthPool = pool;
}

const appUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const apiKey = process.env.BETTER_AUTH_API_KEY;

export const auth = betterAuth({
  database: pool,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "ratefactor-better-auth-secret-key-development",
  baseURL: appUrl,
  trustedOrigins: Array.from(
    new Set(
      [
        appUrl,
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : undefined,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean) as string[]
    )
  ),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "github-client-id-placeholder",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "github-client-secret-placeholder",
    },
  },
  plugins: [
    dash(apiKey ? { apiKey } : {}),
    sentinel(apiKey ? { apiKey } : {}),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "developer",
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
