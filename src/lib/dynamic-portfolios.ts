import { Portfolio } from "@/types/portfolio";

// In-memory runtime cache for real dynamic portfolios submitted by real users
let dynamicPortfolios: Portfolio[] = [];

export function getDynamicPortfolios(): Portfolio[] {
  return dynamicPortfolios;
}

export function setDynamicPortfolios(portfolios: Portfolio[]): void {
  dynamicPortfolios = portfolios;
}
