import { Portfolio } from "../types/portfolio";

export interface ShowcaseWeights {
  ratingWeight: number;      // weight for rating out of 5.0 (default: 35)
  engagementWeight: number;  // weight for likes & comments log scale (default: 30)
  recencyWeight: number;     // weight for submission recency (default: 20)
  baseRandomness: number;    // weight for exploration factor (default: 15)
  repetitionPenalty: number; // penalty deducted if previously showcased (default: 35)
}

export const DEFAULT_SHOWCASE_WEIGHTS: ShowcaseWeights = {
  ratingWeight: 35,
  engagementWeight: 30,
  recencyWeight: 20,
  baseRandomness: 15,
  repetitionPenalty: 35,
};

export interface PortfolioScoreDetail {
  portfolioId: string;
  portfolioTitle: string;
  ratingScore: number;
  engagementScore: number;
  recencyScore: number;
  randomnessScore: number;
  penaltyScore: number;
  totalScore: number;
}

/**
 * Computes transparent algorithmic score breakdown for a portfolio
 * per ARD_PRD_Ratefactor.md Section 6:
 * Score = Base randomness + rating + engagement + recency - previous showcase frequency
 */
export function calculateShowcaseScore(
  portfolio: Portfolio,
  weights: ShowcaseWeights = DEFAULT_SHOWCASE_WEIGHTS,
  showcaseHistoryIds: string[] = []
): PortfolioScoreDetail {
  // 1. Rating component: (rating / 5.0) * ratingWeight
  const rawRating = Number.isFinite(portfolio.rating) ? portfolio.rating : 5.0;
  const ratingNormalized = Math.min(5, Math.max(0, rawRating)) / 5.0;
  const ratingScore = Number((ratingNormalized * weights.ratingWeight).toFixed(2));

  // 2. Engagement component: log scale of (likes + 2 * comments + 1)
  const likes = Number.isFinite(portfolio.likesCount) ? Math.max(0, portfolio.likesCount) : 0;
  const comments = Number.isFinite(portfolio.commentsCount) ? Math.max(0, portfolio.commentsCount) : 0;
  const engagementSum = likes + comments * 2;
  const logEngagement = Math.min(1, Math.log10(engagementSum + 1) / 3.0);
  const engagementScore = Number((logEngagement * weights.engagementWeight).toFixed(2));

  // 3. Recency component: higher score for submissions in last 30 days
  const now = Date.now();
  const parsedTime = portfolio.createdAt ? new Date(portfolio.createdAt).getTime() : NaN;
  const createdTime = Number.isFinite(parsedTime) ? parsedTime : now - 15 * 86400000;
  const daysOld = Math.max(0, (now - createdTime) / (1000 * 60 * 60 * 24));
  const recencyNormalized = Math.max(0, Math.min(1, (30 - daysOld) / 30));
  const recencyScore = Number((recencyNormalized * weights.recencyWeight).toFixed(2));

  // 4. Base randomness: exploration factor
  const randomFactor = Math.random();
  const randomnessScore = Number((randomFactor * weights.baseRandomness).toFixed(2));

  // 5. Repetition penalty: reduce chance if already showcased
  const previousShowcaseCount = showcaseHistoryIds.filter((id) => id === portfolio.id).length;
  const penaltyScore = (portfolio.isShowcase ? weights.repetitionPenalty : 0) + (previousShowcaseCount * weights.repetitionPenalty);

  const totalScore = Number(
    Math.max(0, ratingScore + engagementScore + recencyScore + randomnessScore - penaltyScore).toFixed(2)
  );

  return {
    portfolioId: portfolio.id,
    portfolioTitle: portfolio.title,
    ratingScore,
    engagementScore,
    recencyScore,
    randomnessScore,
    penaltyScore,
    totalScore,
  };
}

/**
 * Runs the automated selection process across candidate portfolios
 */
export function selectShowcaseCandidate(
  candidates: Portfolio[],
  type: "daily" | "weekly",
  weights: ShowcaseWeights = DEFAULT_SHOWCASE_WEIGHTS,
  showcaseHistoryIds: string[] = []
): { winner: Portfolio; scores: PortfolioScoreDetail[]; reason: string } | null {
  if (candidates.length === 0) return null;

  const scores = candidates.map((p) =>
    calculateShowcaseScore(p, weights, showcaseHistoryIds)
  );

  // Sort descending by totalScore
  scores.sort((a, b) => b.totalScore - a.totalScore);

  const winningScore = scores[0];
  const winner = candidates.find((p) => p.id === winningScore.portfolioId) || candidates[0];

  const reason = `${type === "daily" ? "Daily Showcase" : "Weekly Showcase"} elected algorithmically: score ${winningScore.totalScore} (Rating: ${winningScore.ratingScore}, Engagement: ${winningScore.engagementScore}, Recency: ${winningScore.recencyScore}).`;

  return {
    winner,
    scores,
    reason,
  };
}
