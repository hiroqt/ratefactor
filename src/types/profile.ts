export interface UserStatus {
  emoji: string;
  message: string;
  isBusy?: boolean;
  statusType?: "available" | "busy" | "focusing" | "offline";
  updatedAt?: string;
}

export interface GitHubSyncDetails {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  profileUrl?: string;
  totalContributions?: number;
  currentStreak?: number;
  longestStreak?: number;
  publicRepos?: number;
  followers?: number;
  lastSyncedAt?: string;
}

export const AVAILABLE_ROLES = [
  "User",
  "Front End",
  "Backend",
  "Fullstack",
  "UI/UX",
  "QA",
  "ML",
  "Cloud",
  "Network",
  "Data",
  "Graphics",
] as const;

export type StandardRole = typeof AVAILABLE_ROLES[number];

export interface DeveloperProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  pronouns?: string;
  bio: string;
  status: UserStatus;
  availableForHire?: boolean;
  customHireMessage?: string;
  company?: string;
  location?: string;
  website?: string;
  github?: string;
  githubSync?: GitHubSyncDetails;
  twitter?: string;
  linkedin?: string;
  readmeMarkdown?: string;
  pinnedPortfolioIds: string[];
  spotlightPortfolioId?: string;
  skills: string[];
  joinedDate: string;
  isVerified?: boolean;
  onboarded?: boolean;
}

export interface ShowcaseAccolade {
  id: string;
  type: "daily" | "weekly";
  title: string;
  portfolioId: string;
  portfolioTitle: string;
  awardedDate: string;
  iconName: "trophy" | "flame";
}

export interface DeveloperSummary {
  id: string;
  username: string;
  name: string;
  avatar: string;
  role: string;
  isVerified?: boolean;
  onboarded?: boolean;
  createdAt?: string;
  joinedDate?: string;
}


