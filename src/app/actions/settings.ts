"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Settings, type StoredFile } from "@/lib/models";
import { requireSuperAdmin } from "@/lib/session";
import { deleteImage, isRealImage, saveImage } from "@/lib/storage";

/** Values are i18n keys. */
export type SettingsState = { ok?: string; error?: string; errors?: Record<string, string> } | undefined;

const UPI_RE = /^[\w.-]{2,256}@[A-Za-z][\w.-]{1,64}$/;

export async function saveSettings(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const admin = await requireSuperAdmin();

  const feeRaw = String(fd.get("feeAmount") ?? "").trim();
  const feeAmount = feeRaw === "" ? 0 : Number(feeRaw);
  const upiId = String(fd.get("upiId") ?? "").trim();
  const payeeName = String(fd.get("payeeName") ?? "").trim().slice(0, 100);
  const bankDetails = String(fd.get("bankDetails") ?? "").trim().slice(0, 500);
  const removeQr = fd.get("removeQr") === "on";
  const qrFile = fd.get("qr");
  const newQr = isRealImage(qrFile) ? qrFile : null;

  const errors: Record<string, string> = {};
  if (!Number.isInteger(feeAmount) || feeAmount < 0 || feeAmount > 100000) errors.feeAmount = "v.fee";
  if (upiId && !UPI_RE.test(upiId)) errors.upiId = "v.upiId";
  if (newQr && !newQr.type.startsWith("image/")) errors.qr = "v.imageOnly";

  await connectDB();
  const current = await Settings.findById("main");
  const willHaveQr = !!newQr || (!!current?.qr?.key && !removeQr);
  if (!errors.feeAmount && feeAmount > 0 && !willHaveQr && !upiId) errors.qr = "v.needQrOrUpi";
  if (Object.keys(errors).length) return { error: "form.fixSummary", errors };

  let saved: StoredFile | null = null;
  try {
    if (newQr) saved = await saveImage(newQr, "settings");
    const old = current?.qr?.key ? current.qr : null;
    const qr = saved ?? (removeQr ? undefined : old ?? undefined);

    await Settings.findOneAndUpdate(
      { _id: "main" },
      { $set: { feeAmount, upiId, payeeName, bankDetails, qr, updatedBy: admin.id } },
      { upsert: true },
    );
    if (old && (saved || removeQr)) await deleteImage(old);
  } catch (e) {
    if (saved) await deleteImage(saved);
    console.error("[settings] save failed", e);
    const msg = e instanceof Error && e.message.startsWith("err.") ? e.message : "err.saveFailed";
    return { error: msg };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/apply");
  revalidatePath("/");
  return { ok: "set.saved" };
}
