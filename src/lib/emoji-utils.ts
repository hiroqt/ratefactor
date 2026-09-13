/**
 * Lightweight Emoji Mapping Utilities
 * Extracted to decouple card and banner components from the heavy PortfolioDetailModal bundle.
 */

export const EMOJI_MAP: Record<string, string> = {
  "star-struck": "🤩",
  "smiling-face-with-hearts": "🥰",
  "neutral-face": "😐",
  "thumbs-up": "👍",
  "fire": "🔥",
  "rocket": "🚀",
};

export function getEmojiDisplay(name?: string): string {
  if (!name) return "🤩";
  return EMOJI_MAP[name] || name;
}
