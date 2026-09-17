/**
 * Comment deletion authorization decision, shared by the Postgres and
 * in-memory ownership checks in the DELETE comment route (issue #15).
 *
 * Deliberately takes only canonical (immutable) profile ids and a staff
 * flag — never username or display name, which are mutable and can be
 * changed by an attacker to collide with the real author's identity.
 */
export function isCommentDeletionAuthorized({
  actorProfileId,
  commentAuthorProfileId,
  isStaff,
}: {
  actorProfileId: string;
  commentAuthorProfileId: string | null | undefined;
  isStaff: boolean;
}): boolean {
  if (isStaff) return true;
  return !!commentAuthorProfileId && commentAuthorProfileId === actorProfileId;
}
