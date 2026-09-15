import { pool } from "@/lib/auth/better-auth";

// Legacy helpers remain only for compatibility with unused exports while the
// transient GitHub mirror is removed. They never create schema objects.
export async function safeDbQuery(query: string, values: unknown[] = []) {
  try {
    return await pool.query(query, values);
  } catch {
    return null;
  }
}
