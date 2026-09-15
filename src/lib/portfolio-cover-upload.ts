interface SignedUpload {
  cloudName: string;
  apiKey: string;
  folder: string;
  assetName: string;
  publicId: string;
  timestamp: number;
  signature: string;
  receipt: string;
}

export interface UploadedPortfolioCover {
  secureUrl: string;
  publicId: string;
  receipt: string;
  version: number;
  signature: string;
}

export async function uploadPortfolioCover(dataUrl: string): Promise<UploadedPortfolioCover> {
  const signResponse = await fetch("/api/uploads/portfolio", { method: "POST" });
  if (!signResponse.ok) throw new Error("Could not authorize the cover image upload.");
  const signed = await signResponse.json() as SignedUpload;
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const form = new FormData();
  form.append("file", blob);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  form.append("public_id", signed.assetName);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
    { method: "POST", body: form }
  );
  const uploaded = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok || uploaded?.public_id !== signed.publicId ||
      typeof uploaded?.secure_url !== "string" || !uploaded.secure_url.startsWith("https://")) {
    throw new Error("Cloudinary could not upload the cover image.");
  }
  if (!Number.isInteger(uploaded.version) || typeof uploaded.signature !== "string") {
    throw new Error("Cloudinary returned an invalid upload response.");
  }
  return {
    secureUrl: uploaded.secure_url,
    publicId: signed.publicId,
    receipt: signed.receipt,
    version: uploaded.version,
    signature: uploaded.signature,
  };
}

export async function cleanupPortfolioCover(upload: UploadedPortfolioCover) {
  await fetch("/api/uploads/portfolio", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: upload.publicId, receipt: upload.receipt }),
  });
}
