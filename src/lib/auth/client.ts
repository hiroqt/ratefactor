import { createAuthClient } from "better-auth/react";
import { dashClient, sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ||
        process.env.BETTER_AUTH_URL ||
        "http://localhost:3000",
  plugins: [],
});

export const auth = authClient;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export { normalizeUsername } from "./username";
