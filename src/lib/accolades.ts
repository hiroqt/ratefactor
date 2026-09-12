import { Portfolio } from "@/types/portfolio";
import { ShowcaseAccolade } from "@/types/profile";

export { type ShowcaseAccolade } from "@/types/profile";

/**
 * Derives developer showcase accolades from their published portfolios.
 * Extracts Daily and Weekly showcase honors and sorts them chronologically (newest first).
 *
 * @param portfolios Array of developer portfolios
 * @returns Array of earned showcase accolades
 */
export function deriveDeveloperAccolades(
  portfolios: Portfolio[] | undefined | null
): ShowcaseAccolade[] {
  if (!Array.isArray(portfolios) || portfolios.length === 0) {
    return [];
  }

  const accolades: ShowcaseAccolade[] = [];

  for (const portfolio of portfolios) {
    if (!portfolio || !portfolio.id) continue;

    const showcaseType = portfolio.showcaseType;

    if (showcaseType === "weekly") {
      accolades.push({
        id: `accolade-${portfolio.id}-weekly`,
        type: "weekly",
        title: "Weekly Showcase Winner",
        portfolioId: portfolio.id,
        portfolioTitle: portfolio.title,
        awardedDate: portfolio.createdAt || new Date().toISOString(),
        iconName: "trophy",
      });
    } else if (showcaseType === "daily") {
      accolades.push({
        id: `accolade-${portfolio.id}-daily`,
        type: "daily",
        title: "Daily Showcase Winner",
        portfolioId: portfolio.id,
        portfolioTitle: portfolio.title,
        awardedDate: portfolio.createdAt || new Date().toISOString(),
        iconName: "flame",
      });
    }
  }

  return accolades.sort((a, b) => {
    const timeA = new Date(a.awardedDate).getTime();
    const timeB = new Date(b.awardedDate).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeB - timeA;
  });
}
