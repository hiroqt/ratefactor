import type { CommentItem } from "@/types/portfolio";

// In-memory comments store for real user comments
export const portfolioComments = new Map<string, any[]>();

// Comments read from the shared L1 portfolio cache are viewer-neutral: ownership
// lives in the immutable authorProfileId, never in a baked-in isUserOwner. This
// recomputes isUserOwner fresh for the current request/viewer (mirroring how
// isLiked is already decorated per-viewer), returning new comment objects so the
// cached array/objects are never mutated.
export function decorateCommentsForViewer(
  comments: CommentItem[],
  viewerProfileId: string | null
): CommentItem[] {
  return comments.map((comment) => ({
    ...comment,
    isUserOwner: Boolean(viewerProfileId && comment.authorProfileId === viewerProfileId),
  }));
}
