/**
 * High-performance in-memory cache with TTL and LRU-like eviction
 * for caching GitHub profile, contributions, repos, and READMEs.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 15 * 60 * 1000): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateUser(username: string): void {
    const u = username.toLowerCase();
    this.invalidatePrefix(`profile:${u}`);
    this.invalidatePrefix(`contributions:${u}`);
    this.invalidatePrefix(`repos:${u}`);
    this.invalidatePrefix(`readme:${u}/`);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global singleton instance across server requests
const globalCache = ((globalThis as any).__githubMemoryCache ??= new MemoryCache());

export const githubCache = globalCache as MemoryCache;

// Standard TTL constants
export const CACHE_TTL = {
  PROFILE: 15 * 60 * 1000, // 15 minutes
  CONTRIBUTIONS: 15 * 60 * 1000, // 15 minutes
  REPOSITORIES: 15 * 60 * 1000, // 15 minutes
  README: 30 * 60 * 1000, // 30 minutes
};
