import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";

// In-memory comments store initialized from mock portfolios
export const portfolioComments = new Map<string, any[]>();

INITIAL_PORTFOLIOS.forEach((p) => {
  portfolioComments.set(p.id, [...p.comments]);
});
