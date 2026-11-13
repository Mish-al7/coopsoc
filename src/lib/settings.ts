import { connectDB } from "./db";
import { Settings, type StoredFile } from "./models";

export type PaymentSettings = {
  feeAmount: number;
  contributionMin: number;
  upiId: string;
  payeeName: string;
  bankDetails: string;
  qr: StoredFile | null;
  /** Changes whenever the QR image changes — used to bust the browser cache. */
  qrVersion: string;
};

export async function getSettings(): Promise<PaymentSettings> {
  await connectDB();
  const s = await Settings.findById("main").lean();
  return {
    feeAmount: s?.feeAmount ?? 0,
    contributionMin: s?.contributionMin ?? 0,
    upiId: s?.upiId ?? "",
    payeeName: s?.payeeName ?? "",
    bankDetails: s?.bankDetails ?? "",
    qr: s?.qr?.key ? s.qr : null,
    qrVersion: s?.qr?.key ? s.qr.key.slice(-10).replace(/[^\w-]/g, "") : "",
  };
}

export const qrUrl = (s: PaymentSettings) => (s.qr ? `/api/settings/qr?v=${s.qrVersion}` : undefined);

/** upi:// link that opens the member's UPI app with the amount filled in. */
export function upiLink(s: PaymentSettings, note: string) {
  if (!s.upiId || s.feeAmount <= 0) return undefined;
  // Keep "@" in the UPI ID as-is (some UPI apps don't decode %40). The ID is validated to [\w.-]@[\w.-].
  const parts = [`pa=${s.upiId}`];
  if (s.payeeName) parts.push(`pn=${encodeURIComponent(s.payeeName)}`);
  parts.push(`am=${s.feeAmount}`, "cu=INR", `tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join("&")}`;
}

export const formatRupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
