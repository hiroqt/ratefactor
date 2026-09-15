import { DeveloperSummary } from "@/types/profile";

let cachedDevelopers: DeveloperSummary[] | null = null;
let cachedTotalCount = 0;
let developersCacheTimestamp = 0;
let developersEtag = "";
const CACHE_TTL_MS = 60_000; // 60s cache TTL

export function getCachedDevelopers(): {
  developers: DeveloperSummary[] | null;
  totalCount: number;
  etag: string;
  isFresh: boolean;
} {
  const isFresh = Boolean(
    cachedDevelopers &&
    developersCacheTimestamp > 0 &&
    Date.now() - developersCacheTimestamp < CACHE_TTL_MS
  );
  return {
    developers: cachedDevelopers,
    totalCount: cachedTotalCount,
    etag: developersEtag,
    isFresh,
  };
}

export function setCachedDevelopers(developers: DeveloperSummary[], totalCount: number): void {
  cachedDevelopers = developers;
  cachedTotalCount = totalCount;
  developersCacheTimestamp = Date.now();
  const firstId = developers.length > 0 ? developers[0].id : "0";
  developersEtag = `W/"devs-${totalCount}-${firstId}-${Math.floor(developersCacheTimestamp / CACHE_TTL_MS)}"`;
}

export function invalidateDevelopersCache(): void {
  cachedDevelopers = null;
  cachedTotalCount = 0;
  developersCacheTimestamp = 0;
  developersEtag = "";
}
