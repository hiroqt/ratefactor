import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryConfig {
  cloudName: string;
  folder: string;
  secret: string;
}

export function getCloudinaryConfig(): CloudinaryConfig & { apiKey: string } {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER;
  if (!cloudName || !apiKey || !secret || !folder || !/^[\w/-]+$/.test(folder)) {
    throw new Error("Cloudinary portfolio uploads are not configured.");
  }
  return { cloudName, apiKey, secret, folder: folder.replace(/^\/+|\/+$/g, "") };
}

function receiptSignature(userId: string, publicId: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`${userId}\n${publicId}\n${expiresAt}`).digest("hex");
}

export function createUploadReceipt(userId: string, publicId: string, expiresAt: number, secret: string) {
  return `${expiresAt}.${receiptSignature(userId, publicId, expiresAt, secret)}`;
}

export function verifyUploadReceipt(
  receipt: string,
  userId: string,
  publicId: string,
  now: number,
  secret: string
) {
  const [expiresText, signature] = receipt.split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isInteger(expiresAt) || expiresAt < now || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = receiptSignature(userId, publicId, expiresAt, secret);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function isAllowedPortfolioThumbnail(
  thumbnailUrl: string,
  publicId: string | null | undefined,
  config: Pick<CloudinaryConfig, "cloudName" | "folder">
) {
  let url: URL;
  try {
    url = new URL(thumbnailUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (!publicId) return url.hostname !== "res.cloudinary.com";
  if (!publicId.startsWith(`${config.folder}/`) || !/^[\w/-]+$/.test(publicId)) return false;
  return url.protocol === "https:" &&
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(`/${config.cloudName}/image/upload/`) &&
    decodeURIComponent(url.pathname).includes(`/${publicId}.`);
}

function configuredCloudinary() {
  const config = getCloudinaryConfig();
  cloudinary.config({ cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.secret, secure: true });
  return { cloudinary, config };
}

export function createPortfolioUploadSignature(userId: string) {
  const { cloudinary: client, config } = configuredCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const assetName = randomUUID();
  const publicId = `${config.folder}/${assetName}`;
  const signature = client.utils.api_sign_request(
    { folder: config.folder, public_id: assetName, timestamp },
    config.secret
  );
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder: config.folder,
    assetName,
    publicId,
    timestamp,
    signature,
    receipt: createUploadReceipt(userId, publicId, timestamp + 15 * 60, config.secret),
  };
}

export async function deletePortfolioAsset(publicId: string) {
  const { cloudinary: client, config } = configuredCloudinary();
  if (!publicId.startsWith(`${config.folder}/`) || !/^[\w/-]+$/.test(publicId)) return false;
  const result = await client.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  return result.result === "ok" || result.result === "not found";
}

export function verifyPortfolioUploadResponse(publicId: string, version: number, signature: string) {
  const { cloudinary: client, config } = configuredCloudinary();
  if (!/^[a-f0-9]{40}$/.test(signature)) return false;
  const expected = client.utils.api_sign_request({ public_id: publicId, version }, config.secret);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function uploadPortfolioDataUrl(dataUrl: string, assetName: string) {
  const { cloudinary: client, config } = configuredCloudinary();
  if (!/^data:image\/(?:png|jpeg|webp);base64,/.test(dataUrl)) throw new Error("Unsupported portfolio image data.");
  return client.uploader.upload(dataUrl, {
    folder: config.folder,
    public_id: assetName,
    resource_type: "image",
    overwrite: false,
  });
}
