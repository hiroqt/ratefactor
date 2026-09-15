import assert from "node:assert/strict";
import test from "node:test";
import { v2 as cloudinary } from "cloudinary";
import {
  createUploadReceipt,
  isAllowedPortfolioThumbnail,
  verifyPortfolioUploadResponse,
  verifyUploadReceipt,
// @ts-expect-error Node's built-in type-stripping runner requires the extension.
} from "./cloudinary.ts";

const config = { cloudName: "ratefactor", folder: "portfolio-covers", secret: "test-secret" };
const publicId = "portfolio-covers/550e8400-e29b-41d4-a716-446655440000";
const cloudinaryUrl = `https://res.cloudinary.com/ratefactor/image/upload/v1/${publicId}.webp`;

test("accepts external URLs only without Cloudinary metadata", () => {
  assert.equal(isAllowedPortfolioThumbnail("https://images.unsplash.com/example.jpg", null, config), true);
  assert.equal(isAllowedPortfolioThumbnail("data:image/webp;base64,AAAA", null, config), false);
  assert.equal(isAllowedPortfolioThumbnail("https://example.com/image.jpg", publicId, config), false);
});

test("accepts only this app's Cloudinary folder", () => {
  assert.equal(isAllowedPortfolioThumbnail(cloudinaryUrl, publicId, config), true);
  assert.equal(isAllowedPortfolioThumbnail(cloudinaryUrl, "other-folder/example", config), false);
});

test("upload receipts are user-bound and expire", () => {
  const now = 1_700_000_000;
  const receipt = createUploadReceipt("user-1", publicId, now + 60, config.secret);
  assert.equal(verifyUploadReceipt(receipt, "user-1", publicId, now, config.secret), true);
  assert.equal(verifyUploadReceipt(receipt, "user-2", publicId, now, config.secret), false);
  assert.equal(verifyUploadReceipt(receipt, "user-1", publicId, now + 61, config.secret), false);
});

test("verifies Cloudinary's signed upload response", () => {
  process.env.CLOUDINARY_CLOUD_NAME = config.cloudName;
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = config.secret;
  process.env.CLOUDINARY_UPLOAD_FOLDER = config.folder;
  const version = 1_700_000_000;
  const signature = cloudinary.utils.api_sign_request({ public_id: publicId, version }, config.secret);
  assert.equal(verifyPortfolioUploadResponse(publicId, version, signature), true);
  assert.equal(verifyPortfolioUploadResponse(publicId, version, "0".repeat(40)), false);
});
