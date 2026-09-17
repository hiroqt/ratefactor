import assert from "node:assert/strict";
import test from "node:test";
import {
  isCommentDeletionAuthorized,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./comment-authorization.ts";

const OWNER = "11111111-1111-1111-1111-111111111111";
const ATTACKER = "22222222-2222-2222-2222-222222222222";

test("owner deleting their own comment (immutable id match) is allowed", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: OWNER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    true
  );
});

test("display-name/full_name collision does not authorize deletion (issue #15 core regression)", () => {
  // Attacker renamed their display name to match the real author's, but the
  // authorization decision below only ever sees profile ids, never names.
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    false
  );
});

test("username collision does not authorize deletion", () => {
  // Same as above: username is never part of the decision, only canonical ids.
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    false
  );
});

test("memory-fallback: attacker with mismatched immutable author id is denied even if mutable fields matched", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    false
  );
});

test("memory-fallback: owner's immutable author id matches actor's canonical id -> allowed", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: OWNER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    true
  );
});

test("moderator can delete another user's comment", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: true,
    }),
    true
  );
});

test("admin can delete another user's comment", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: true,
    }),
    true
  );
});

test("ordinary non-owner, non-staff user is denied", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: OWNER,
      isStaff: false,
    }),
    false
  );
});

test("missing/unknown comment author id fails closed (denied) for non-staff", () => {
  assert.equal(
    isCommentDeletionAuthorized({
      actorProfileId: ATTACKER,
      commentAuthorProfileId: null,
      isStaff: false,
    }),
    false
  );
});
