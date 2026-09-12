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

export interface CommentItem {
  id: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
  isUserOwner?: boolean;
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
  };
  techStack: string[];
  category: "Developer" | "Arts" | "Client" | "Frontend" | "Fullstack" | "Systems" | "Design Engineer" | "Mobile" | "AI / ML";
  rating: number;
  ratingCount: number;
  ratingBreakdown: RatingBreakdown;
  likesCount: number;
  isLiked?: boolean;
  userRating?: number;
  userRatingBreakdown?: RatingBreakdown;
  commentsCount: number;
  comments: CommentItem[];
  createdAt: string;
  isShowcase?: boolean;
  showcaseType?: "daily" | "weekly" | null;
  showcaseReason?: string;
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
