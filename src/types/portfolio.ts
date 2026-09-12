export type PortfolioCategory =
  | "All"
  | "Developer"
  | "Arts"
  | "Client"
  | "Frontend"
  | "Fullstack"
  | "Systems"
  | "Design Engineer"
  | "Mobile"
  | "AI / ML";

export type CritiqueTag =
  | "ui_suggestion"
  | "bug_spotted"
  | "performance_tip"
  | "love_detail";

export interface CritiqueTagConfig {
  label: string;
  emoji: string;
  badgeClass: string;
}

export const CRITIQUE_TAG_CONFIG: Record<CritiqueTag, CritiqueTagConfig> = {
  ui_suggestion: {
    label: "UI Suggestion",
    emoji: "💡",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  },
  bug_spotted: {
    label: "Bug Spotted",
    emoji: "🐛",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
  },
  performance_tip: {
    label: "Performance Tip",
    emoji: "⚡",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
  },
  love_detail: {
    label: "Love this Detail",
    emoji: "🔥",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50",
  },
};

export interface CommentItem {
  id: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
  isUserOwner?: boolean;
  critiqueTag?: CritiqueTag | null;
}

export interface RatingBreakdown {
  design: number;
  codeQuality: number;
  performance: number;
  documentation: number;
}

export interface Portfolio {
  id: string;
  title: string;
  tagline: string;
  description: string;
  portfolioUrl: string;
  githubUrl: string;
  demoUrl?: string;
  thumbnail: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    role: string;
    isVerified?: boolean;
    availableForHire?: boolean;
  };
  techStack: string[];
  category: "Developer" | "Arts" | "Client" | "Frontend" | "Fullstack" | "Systems" | "Design Engineer" | "Mobile" | "AI / ML";
  rating: number;
  ratingCount: number;
  ratingBreakdown: RatingBreakdown;
  likesCount: number;
  isLiked?: boolean;
  userReaction?: string;
  reactions?: Record<string, number>;
  userRating?: number;
  userRatingBreakdown?: RatingBreakdown;
  commentsCount: number;
  comments: CommentItem[];
  createdAt: string;
  isShowcase?: boolean;
  showcaseType?: "daily" | "weekly" | null;
  showcaseReason?: string;
  requestCritique?: boolean;
}

export interface NotificationItem {
  id: string;
  type: "like" | "rating" | "comment" | "showcase";
  actorName: string;
  actorAvatar: string;
  portfolioId: string;
  portfolioTitle: string;
  message: string;
  ratingScore?: number;
  timestamp: string;
  isRead: boolean;
}

export type SortOption =
  | "highest_rated"
  | "most_liked"
  | "most_discussed"
  | "latest"
  | "showcase";

export * from "./profile";
