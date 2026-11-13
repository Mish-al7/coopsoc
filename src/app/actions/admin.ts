"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Application, nextSeq } from "@/lib/models";
import { requireAdmin } from "@/lib/session";
import { STATUSES, type Status } from "@/lib/society";

/** `ok` / `error` are i18n keys, `vars` fills their placeholders. */
export type ReviewState = { ok?: string; error?: string; vars?: Record<string, string> } | undefined;

export async function reviewApplication(id: string, _: ReviewState, fd: FormData): Promise<ReviewState> {
  const admin = await requireAdmin();
  if (!isValidObjectId(id)) return { error: "err.notFound" };

  const status = String(fd.get("status") ?? "") as Status;
  if (!STATUSES.includes(status)) return { error: "err.status" };
  const aadhaarVerified = fd.get("aadhaarVerified") === "on";
  const paymentVerified = fd.get("paymentVerified") === "on";
  const officeNote = String(fd.get("officeNote") ?? "").trim().slice(0, 1000);
  let membershipNo = String(fd.get("membershipNo") ?? "").trim().slice(0, 40);

  if (status === "approved" && !aadhaarVerified) return { error: "err.approveNeedsAadhaar" };
  if (status === "needs_changes" && !officeNote) return { error: "err.needsNote" };

  await connectDB();
  const app = await Application.findById(id);
  if (!app) return { error: "err.notFound" };

  // Applications that sent a fee screenshot can only be approved once the money is confirmed.
  const hasPayment = !!app.files?.payment?.key;
  if (status === "approved" && hasPayment && !paymentVerified) return { error: "err.approveNeedsPayment" };

  if (status === "approved") {
    if (!membershipNo) membershipNo = app.membershipNo || `M-${String(await nextSeq("membership")).padStart(4, "0")}`;
    if (await Application.exists({ membershipNo, _id: { $ne: app._id } }))
      return { error: "err.memberNoTaken", vars: { no: membershipNo } };
  }

  if (hasPayment) app.set("payment.verified", paymentVerified);
  app.set({
    status,
    aadhaarVerified,
    officeNote,
    membershipNo: membershipNo || undefined,
    reviewedBy: admin.id,
    reviewedAt: new Date(),
  });
  await app.save();

  revalidatePath("/admin");
  revalidatePath(`/admin/applications/${id}`);
  return status === "approved" ? { ok: "rev.approved", vars: { no: membershipNo } } : { ok: "rev.saved" };
}
