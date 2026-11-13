import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { StoredFile } from "./models";

// Images go to Cloudinary when its keys are set; otherwise (local testing)
// they are written to ./.data/uploads. Either way they are never public:
// the app serves them through /api/files after checking who is asking.
//
// sharp and cloudinary are loaded only when an image is actually handled, so a
// problem with either one can never stop a page (like /apply) from opening.

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

type Cloudinary = (typeof import("cloudinary"))["v2"];

async function getCloudinary(): Promise<Cloudinary | null> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/** Hosted servers (Vercel) have a read-only disk, so local storage only works on a dev machine. */
function localStorageAllowed() {
  return !process.env.VERCEL;
}

export function isRealImage(f: FormDataEntryValue | null): f is File {
  return !!f && typeof f !== "string" && f.size > 0;
}

export async function saveImage(file: File, folder: string): Promise<StoredFile> {
  // Errors thrown with an i18n key so the form can show them in the user's language.
  if (file.size > MAX_INPUT_BYTES) throw new Error("err.imageTooBig");
  const input = Buffer.from(await file.arrayBuffer());

  // Re-encode: fixes rotation, strips EXIF/GPS, caps size, flattens transparent signatures.
  let out: { data: Buffer; info: { size: number; width: number; height: number } };
  try {
    const { default: sharp } = await import("sharp");
    out = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch (e) {
    console.error("[storage] image processing failed", e);
    throw new Error("err.imageUnreadable");
  }
  const meta = { bytes: out.info.size, width: out.info.width, height: out.info.height };

  const cloudinary = await getCloudinary();
  if (cloudinary) {
    const res = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `coopsoc/${folder}`, type: "authenticated", resource_type: "image" },
          (err, r) => (err || !r ? reject(err ?? new Error("upload failed")) : resolve(r)),
        )
        .end(out.data);
    });
    return { provider: "cloudinary", key: res.public_id, ...meta };
  }

  if (!localStorageAllowed()) {
    console.error("[storage] CLOUDINARY_* env vars are missing on this server");
    throw new Error("err.saveFailed");
  }
  const key = `${folder}/${crypto.randomUUID()}.jpg`;
  const full = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, out.data);
  return { provider: "local", key, ...meta };
}

export async function readImage(f: StoredFile): Promise<Buffer> {
  if (f.provider === "cloudinary") {
    const cloudinary = await getCloudinary();
    if (!cloudinary) throw new Error("Cloudinary is not configured");
    const url = cloudinary.url(f.key, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      resource_type: "image",
      format: "jpg",
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const full = path.resolve(LOCAL_ROOT, f.key);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("bad path");
  return fs.readFile(full);
}

export async function deleteImage(f: StoredFile | null | undefined) {
  if (!f) return;
  try {
    if (f.provider === "cloudinary") {
      const cloudinary = await getCloudinary();
      if (cloudinary) await cloudinary.uploader.destroy(f.key, { type: "authenticated", resource_type: "image" });
    } else {
      const full = path.resolve(LOCAL_ROOT, f.key);
      if (full.startsWith(LOCAL_ROOT + path.sep)) await fs.unlink(full);
    }
  } catch (e) {
    console.warn("[storage] delete failed", f.key, e);
  }
}
