"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Application, nextSeq, type StoredFile } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { decrypt, encrypt, hashAadhaar } from "@/lib/crypto";
import { deleteImage, isRealImage, saveImage } from "@/lib/storage";
import { allErrors, applicationSchema, FILE_SLOTS, formText, MAX_EXTRA, OPTIONAL_SLOTS, type FileSlot } from "@/lib/validation";
import { SOCIETY } from "@/lib/society";
import { getSettings } from "@/lib/settings";

const PAYMENT_REF_RE = /^[A-Za-z0-9 /-]{0,40}$/;

/** `error` and `errors` values are i18n keys. */
export type FormState = { error?: string; errors?: Record<string, string> } | undefined;

const EDITABLE = ["submitted", "needs_changes"];

export async function submitApplication(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await connectDB();

  const existing = await Application.findOne({ user: user.id });
  if (existing && !EDITABLE.includes(existing.status)) {
    return { error: "err.locked" };
  }

  const raw = formText(fd);
  const parsed = applicationSchema.safeParse(raw);
  const errors: Record<string, string> = allErrors(raw, parsed.success ? undefined : parsed.error);

  // Images
  const incoming: Partial<Record<FileSlot, File>> = {};
  for (const slot of FILE_SLOTS) {
    const f = fd.get(slot);
    if (isRealImage(f)) {
      if (!f.type.startsWith("image/")) errors[slot] = "v.imageOnly";
      else incoming[slot] = f;
    } else if (!existing?.files?.[slot] && !OPTIONAL_SLOTS.has(slot)) {
      errors[slot] = "v.photoRequired";
    }
  }
  // Membership fee screenshot (needed whenever the super admin has set a fee).
  const settings = await getSettings();
  const payFile = fd.get("payment");
  const newPayment = isRealImage(payFile) ? payFile : null;
  if (newPayment && !newPayment.type.startsWith("image/")) errors.payment = "v.imageOnly";
  else if (settings.feeAmount > 0 && !newPayment && !existing?.files?.payment) errors.payment = "v.paymentRequired";
  const paymentRef = String(fd.get("paymentRef") ?? "").trim().toUpperCase();
  if (!PAYMENT_REF_RE.test(paymentRef)) errors.paymentRef = "v.paymentRef";

  const oldExtras: StoredFile[] = existing?.files?.extra ?? [];
  const keepIdx = new Set(fd.getAll("keepExtra").map(Number));
  const keptExtras = oldExtras.filter((_, i) => keepIdx.has(i));
  const newExtras = fd.getAll("extra").filter(isRealImage).filter((f) => f.type.startsWith("image/"));
  if (keptExtras.length + newExtras.length > MAX_EXTRA) errors.extra = "v.extraMax";

  if (!parsed.success || Object.keys(errors).length) {
    return { error: "form.fixSummary", errors };
  }
  const d = parsed.data;

  const aadhaarHash = hashAadhaar(d.aadhaar);
  if (await Application.exists({ aadhaarHash, user: { $ne: user.id } })) {
    return { errors: { aadhaar: "v.aadhaarDuplicate" }, error: "err.aadhaarExists" };
  }

  // Upload new images first; roll them back if anything later fails.
  const uploaded: StoredFile[] = [];
  const replaced: StoredFile[] = [];
  try {
    const slotUploads = await Promise.all(
      FILE_SLOTS.map(async (slot) => {
        const f = incoming[slot];
        if (!f) return [slot, null] as const;
        const s = await saveImage(f, slot);
        uploaded.push(s);
        return [slot, s] as const;
      }),
    );
    const extraUploads = await Promise.all(
      newExtras.map(async (f) => {
        const s = await saveImage(f, "extra");
        uploaded.push(s);
        return s;
      }),
    );
    const paymentUpload = newPayment ? await saveImage(newPayment, "payment") : null;
    if (paymentUpload) uploaded.push(paymentUpload);

    const files = {
      photo: existing?.files?.photo,
      signature: existing?.files?.signature,
      aadhaarFront: existing?.files?.aadhaarFront,
      aadhaarBack: existing?.files?.aadhaarBack,
      nomineePhoto: existing?.files?.nomineePhoto,
      nomineeAadhaarFront: existing?.files?.nomineeAadhaarFront,
      nomineeAadhaarBack: existing?.files?.nomineeAadhaarBack,
      payment: existing?.files?.payment,
      extra: [...keptExtras, ...extraUploads],
    } as Record<FileSlot | "payment", StoredFile | undefined> & { extra: StoredFile[] };
    if (paymentUpload) {
      if (files.payment) replaced.push(files.payment);
      files.payment = paymentUpload;
    }

    // A new screenshot (or a changed transaction ID) must be checked again by the office.
    const oldPay = existing?.payment;
    const payment = paymentUpload
      ? { amount: settings.feeAmount, ref: paymentRef, verified: false }
      : files.payment
        ? { amount: oldPay?.amount ?? settings.feeAmount, ref: paymentRef, verified: !!oldPay?.verified && (oldPay?.ref ?? "") === paymentRef }
        : undefined;
    for (const [slot, s] of slotUploads) {
      if (!s) continue;
      if (files[slot]) replaced.push(files[slot]!);
      files[slot] = s;
    }
    replaced.push(...oldExtras.filter((_, i) => !keepIdx.has(i)));

    const data = {
      name: d.name,
      guardianRelation: d.guardianRelation,
      guardianName: d.guardianName,
      age: d.age,
      occupation: d.occupation,
      phone: d.phone,
      address: d.address,
      desam: d.desam,
      village: d.village,
      taluk: d.taluk,
      aadhaarEnc: encrypt(d.aadhaar),
      aadhaarHash,
      aadhaarLast4: d.aadhaar.slice(-4),
      bank: {
        holderName: d.bankHolder,
        accountEnc: encrypt(d.bankAccount),
        accountLast4: d.bankAccount.slice(-4),
        ifsc: d.bankIfsc,
        bankName: d.bankName,
        branch: d.bankBranch,
      },
      nominee: {
        name: d.nomineeName,
        relation: d.nomineeRelation,
        age: d.nomineeAge,
        phone: d.nomineePhone,
        address: d.nomineeAddress,
        aadhaarEnc: encrypt(d.nomineeAadhaar),
        aadhaarLast4: d.nomineeAadhaar.slice(-4),
      },
      shares: d.shares,
      files,
      payment,
      status: "submitted" as const,
      submittedAt: new Date(),
    };

    if (existing) {
      // The applicant's or the nominee's Aadhaar changed → the office must check it again.
      const aadhaarChanged =
        existing.aadhaarHash !== aadhaarHash ||
        decrypt(existing.nominee?.aadhaarEnc) !== d.nomineeAadhaar ||
        !!incoming.aadhaarFront ||
        !!incoming.aadhaarBack ||
        !!incoming.nomineeAadhaarFront ||
        !!incoming.nomineeAadhaarBack;
      existing.set({ ...data, aadhaarVerified: aadhaarChanged ? false : existing.aadhaarVerified });
      await existing.save();
    } else {
      const seq = await nextSeq(`app-${new Date().getFullYear()}`);
      await Application.create({
        ...data,
        user: user.id,
        applicationNo: `${SOCIETY.appNoPrefix}-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
      });
    }
  } catch (e) {
    await Promise.all(uploaded.map(deleteImage));
    console.error("[application] save failed", e);
    if ((e as { code?: number }).code === 11000)
      return { error: "err.aadhaarExists", errors: { aadhaar: "v.aadhaarDuplicate" } };
    const msg = e instanceof Error && e.message.startsWith("err.") ? e.message : "err.saveFailed";
    return { error: msg };
  }

  await Promise.all(replaced.map(deleteImage));
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard?saved=1");
}
