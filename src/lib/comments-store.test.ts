import assert from "node:assert/strict";
import test from "node:test";
import type { CommentItem } from "../types/portfolio";
import {
  decorateCommentsForViewer,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./comments-store.ts";

function makeComment(overrides: Partial<CommentItem> & { authorProfileId: string | null }): CommentItem {
  return {
    id: "c1",
    authorName: "Dev",
    authorUsername: "dev",
    authorAvatar: "https://example.com/avatar.png",
    content: "Nice work!",
    createdAt: new Date().toISOString(),
    likes: 0,
    isUserOwner: false,
    critiqueTag: null,
    ...overrides,
  };
}

test("real owner (User A) sees isUserOwner true for their own comment", () => {
  const comments = [makeComment({ id: "c1", authorProfileId: "user-a" })];
  const decorated = decorateCommentsForViewer(comments, "user-a");
  assert.equal(decorated[0].isUserOwner, true);
});

test("a different viewer (User B) reading the same cached comment sees isUserOwner false", () => {
  const comments = [makeComment({ id: "c1", authorProfileId: "user-a" })];
  const decorated = decorateCommentsForViewer(comments, "user-b");
  assert.equal(decorated[0].isUserOwner, false);
});

test("anonymous/unauthenticated viewer (null profile id) always sees isUserOwner false", () => {
  const comments = [makeComment({ id: "c1", authorProfileId: "user-a" })];
  const decorated = decorateCommentsForViewer(comments, null);
  assert.equal(decorated[0].isUserOwner, false);
});

test("each viewer sees correct ownership across a mixed feed (real owner still true on their own comment)", () => {
  const comments = [
    makeComment({ id: "c1", authorProfileId: "user-a" }),
    makeComment({ id: "c2", authorProfileId: "user-b" }),
  ];
  const forB = decorateCommentsForViewer(comments, "user-b");
  assert.equal(forB.find((c) => c.id === "c1")!.isUserOwner, false);
  assert.equal(forB.find((c) => c.id === "c2")!.isUserOwner, true);

  const forA = decorateCommentsForViewer(comments, "user-a");
  assert.equal(forA.find((c) => c.id === "c1")!.isUserOwner, true);
  assert.equal(forA.find((c) => c.id === "c2")!.isUserOwner, false);
});

test("decoration does not mutate the source (cached) comment objects or array", () => {
  const source = [makeComment({ id: "c1", authorProfileId: "user-a", isUserOwner: false })];
  const snapshotBefore = JSON.parse(JSON.stringify(source));

  const decoratedForA = decorateCommentsForViewer(source, "user-a");

  // Source (what the shared cache holds) must remain viewer-neutral/unchanged.
  assert.deepEqual(JSON.parse(JSON.stringify(source)), snapshotBefore);
  assert.notEqual(decoratedForA, source);
  assert.notEqual(decoratedForA[0], source[0]);

  // A later decoration for a different viewer must not be corrupted by the first call.
  const decoratedForB = decorateCommentsForViewer(source, "user-b");
  assert.equal(decoratedForB[0].isUserOwner, false);
  assert.equal(decoratedForA[0].isUserOwner, true);
});
