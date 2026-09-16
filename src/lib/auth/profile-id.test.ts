import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import {
  resolveCanonicalProfileId,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./profile-id.ts";

test("passes a UUID Better Auth id through unchanged (lowercased)", () => {
  const uuid = "550E8400-E29B-41D4-A716-446655440000";
  assert.equal(resolveCanonicalProfileId(uuid), uuid.toLowerCase());
});

test("maps a non-UUID Better Auth id to the same deterministic UUID the DB trigger derives", () => {
  const betterAuthId = "ba_user_12345";
  const hex = crypto.createHash("md5").update(`ratefactor:${betterAuthId}`).digest("hex");
  const expected = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  assert.equal(resolveCanonicalProfileId(betterAuthId), expected);
  // Deterministic: calling it again for the same input (e.g. a comment report
  // route resolving the same actor) must yield the same profile id.
  assert.equal(resolveCanonicalProfileId(betterAuthId), resolveCanonicalProfileId(betterAuthId));
});
