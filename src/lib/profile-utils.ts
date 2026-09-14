import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";

export function createProfileFromAuthor(
  author: {
    name: string;
    username: string;
    avatar?: string;
    role?: string;
    isVerified?: boolean;
    availableForHire?: boolean;
    customHireMessage?: string;
    createdAt?: string;
    joinedDate?: string;
  },
  portfolios: Portfolio[],
  baseProfile?: DeveloperProfile
): DeveloperProfile {
  const authorPortfolios = portfolios.filter(
    (p) =>
      p.author?.username?.toLowerCase() === author.username.toLowerCase() ||
      p.author?.name?.toLowerCase() === author.name.toLowerCase()
  );

  const allSkills = Array.from(new Set(authorPortfolios.flatMap((p) => p.techStack || [])));

  const earliestPortfolioDate = authorPortfolios.length > 0
    ? authorPortfolios.reduce((earliest, p) => {
        const pDate = new Date(p.createdAt).getTime();
        const eDate = new Date(earliest).getTime();
        return !isNaN(pDate) && pDate < eDate ? p.createdAt : earliest;
      }, authorPortfolios[0].createdAt)
    : undefined;

  const resolvedJoinedDate =
    author.createdAt ||
    author.joinedDate ||
    (baseProfile?.joinedDate && baseProfile.joinedDate !== "2026" ? baseProfile.joinedDate : undefined) ||
    earliestPortfolioDate ||
    new Date().toISOString();

  if (baseProfile && baseProfile.username.toLowerCase() === author.username.toLowerCase()) {
    return {
      ...baseProfile,
      availableForHire: baseProfile.availableForHire ?? true,
      customHireMessage:
        baseProfile.customHireMessage ||
        "Open for contract engineering and full-time architecture roles.",
      pinnedPortfolioIds:
        baseProfile.pinnedPortfolioIds.length > 0
          ? baseProfile.pinnedPortfolioIds
          : authorPortfolios.slice(0, 6).map((p) => p.id),
      spotlightPortfolioId: baseProfile.spotlightPortfolioId || authorPortfolios[0]?.id,
      skills: baseProfile.skills.length > 0 ? baseProfile.skills : allSkills,
      joinedDate:
        (baseProfile.joinedDate && baseProfile.joinedDate !== "2026")
          ? baseProfile.joinedDate
          : resolvedJoinedDate,
    };
  }

  return {
    id: `profile-${author.username}`,
    name: author.name,
    username: author.username.replace(/^@/, ""),
    avatar:
      author.avatar ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    role: author.role || "Fullstack Architect",
    bio: `${author.name} is a developer and builder showcasing architectures on RateFactor.`,
    status: {
      emoji: "⚡",
      message: "Building architectures",
      statusType: "available",
    },
    availableForHire: author.availableForHire ?? true,
    customHireMessage:
      author.customHireMessage ||
      "Open for contract engineering and full-time architecture roles.",
    github: baseProfile?.github || "",
    pinnedPortfolioIds: authorPortfolios.slice(0, 6).map((p) => p.id),
    spotlightPortfolioId: authorPortfolios[0]?.id,
    skills: allSkills.length > 0 ? allSkills : ["TypeScript", "Next.js", "React"],
    joinedDate: resolvedJoinedDate,
  };
}
