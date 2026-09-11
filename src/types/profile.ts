export interface UserStatus {
  emoji: string;
  message: string;
  isBusy?: boolean;
  statusType?: "available" | "busy" | "focusing" | "offline";
  updatedAt?: string;
}

export interface DeveloperProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: string;
  pronouns?: string;
  bio: string;
  status: UserStatus;
  company?: string;
  location?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  readmeMarkdown?: string;
  pinnedPortfolioIds: string[];
  spotlightPortfolioId?: string;
  skills: string[];
  joinedDate: string;
}
