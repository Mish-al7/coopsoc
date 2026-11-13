import crypto from "node:crypto";

// Aadhaar numbers are stored encrypted (AES-256-GCM), never in plain text.
// A keyed hash is stored alongside so duplicates can be detected without decrypting.

function key(): Buffer {
  const secret = process.env.AADHAAR_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("AADHAAR_SECRET (or SESSION_SECRET) is not set");
  return crypto.createHash("sha256").update(`aadhaar:${secret}`).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string | undefined | null): string {
  if (!payload) return "";
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashAadhaar(n: string): string {
  return crypto.createHmac("sha256", key()).update(n).digest("hex");
}
