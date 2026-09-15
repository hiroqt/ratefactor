import { Portfolio } from "@/types/portfolio";

// In-memory runtime cache for real dynamic portfolios submitted by real users
let dynamicPortfolios: Portfolio[] = [];
let cachedDevelopersCount = 0;
let portfoliosCacheTime = 0;
let portfoliosCacheEtag = "";

// Cache TTL: 45 seconds. Within this window, repeated requests are served from memory
// with 0 database egress. The cache is immediately invalidated on mutations (create, rate, like, comment).
const CACHE_TTL_MS = 45 * 1000;

export function getCachedPortfolios(): {
  portfolios: Portfolio[];
  developersCount: number;
  etag: string;
  isFresh: boolean;
} {
  const now = Date.now();
  const isFresh = Boolean(
    dynamicPortfolios.length > 0 &&
    portfoliosCacheTime > 0 &&
    now - portfoliosCacheTime < CACHE_TTL_MS
  );
  return {
    portfolios: dynamicPortfolios,
    developersCount: cachedDevelopersCount,
    etag: portfoliosCacheEtag,
    isFresh,
  };
}

export function setCachedPortfolios(portfolios: Portfolio[], developersCount: number): void {
  dynamicPortfolios = portfolios;
  cachedDevelopersCount = developersCount;
  portfoliosCacheTime = Date.now();

  // Generate lightweight deterministic ETag based on length, timestamp, and IDs
  const sample = portfolios
    .slice(0, 10)
    .map((p) => `${p.id}:${p.likesCount}:${p.commentsCount}:${p.rating}`)
    .join(";");
  const hash = Buffer.from(sample).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  portfoliosCacheEtag = `W/"${portfolios.length}-${portfoliosCacheTime.toString(36)}-${hash}"`;
}

export function invalidatePortfoliosCache(): void {
  portfoliosCacheTime = 0;
  portfoliosCacheEtag = "";
}

export function getDynamicPortfolios(): Portfolio[] {
  return dynamicPortfolios;
}

export function setDynamicPortfolios(portfolios: Portfolio[]): void {
  dynamicPortfolios = portfolios;
}
