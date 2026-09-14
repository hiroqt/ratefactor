import { DeveloperProfile } from "@/types/profile";

export const INITIAL_DEVELOPER_PROFILE: DeveloperProfile = {
  id: "user-default",
  name: "Developer",
  username: "developer",
  avatar: "",
  role: "",
  pronouns: "",
  bio: "",
  status: {
    emoji: "",
    message: "",
    isBusy: false,
    statusType: "available",
    updatedAt: "",
  },
  availableForHire: false,
  customHireMessage: "",
  company: "",
  location: "",
  website: "",
  github: "",
  twitter: "",
  linkedin: "",
  readmeMarkdown: "",
  pinnedPortfolioIds: [],
  spotlightPortfolioId: undefined,
  skills: [],
  joinedDate: "2026-09-13T00:00:00.000Z",
};

export const STATUS_PRESETS = [
  { emoji: "🎯", message: "Deep work / Focusing", statusType: "focusing" as const },
  { emoji: "🚀", message: "Shipping features & updates", statusType: "available" as const },
  { emoji: "💻", message: "Coding new architecture", statusType: "available" as const },
  { emoji: "🛠️", message: "Debugging memory leaks", statusType: "busy" as const },
  { emoji: "☕", message: "Coffee break / Catching up", statusType: "available" as const },
  { emoji: "⚡", message: "Benchmarking performance", statusType: "focusing" as const },
  { emoji: "🤝", message: "Open for collab & reviews", statusType: "available" as const },
  { emoji: "🌴", message: "AFK / Out of office", statusType: "offline" as const },
];
