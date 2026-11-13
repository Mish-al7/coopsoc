"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Application, Contribution, nextSeq } from "@/lib/models";
import { requireAdmin, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { deleteImage, isRealImage, PDF_MIME, saveDocument } from "@/lib/storage";

/** Values are i18n keys; `vars` fills their placeholders. */
export type ContributionState =
  | { ok?: string; error?: string; errors?: Record<string, string>; vars?: Record<string, string | number>; done?: number }
  | undefined;

const REF_RE = /^[A-Za-z0-9 /-]{0,40}$/;
const MAX_AMOUNT = 10_00_00_000; // ₹10 crore — a typo guard, not a business rule

export async function submitContribution(_: ContributionState, fd: FormData): Promise<ContributionState> {
  const user = await requireUser();
  await connectDB();
  const app = await Application.findOne({ user: user.id }, { status: 1 }).lean();
  if (!app || app.status !== "approved") return { error: "pc.membersOnly" };

  const { contributionMin } = await getSettings();
  const min = Math.max(1, contributionMin);
  const errors: Record<string, string> = {};
  const amountRaw = String(fd.get("amount") ?? "").replace(/[,\s]/g, "");
  const amount = Number(amountRaw);
  if (!amountRaw) errors.amount = "v.amountRequired";
  else if (!Number.isInteger(amount) || amount < min || amount > MAX_AMOUNT) errors.amount = "v.amountMin";
  const ref = String(fd.get("ref") ?? "").trim().toUpperCase();
  if (!REF_RE.test(ref)) errors.ref = "v.paymentRef";
  const slip = fd.get("slip");
  if (!isRealImage(slip)) errors.slip = "v.slipRequired";
  else if (!(slip.type.startsWith("image/") || slip.type === PDF_MIME || /\.pdf$/i.test(slip.name))) errors.slip = "v.slipType";
  if (Object.keys(errors).length) return { error: "form.fixSummary", errors, vars: { min } };

  let stored;
  try {
    stored = await saveDocument(slip as File, "contribution");
    await Contribution.create({ user: user.id, application: app._id, amount, ref: ref || undefined, slip: stored });
  } catch (e) {
    if (stored) await deleteImage(stored);
    console.error("[contribution] save failed", e);
    const msg = e instanceof Error && e.message.startsWith("err.") ? e.message : "err.saveFailed";
    return { error: msg };
  }

  revalidatePath("/contributions");
  revalidatePath("/admin/contributions");
  return { ok: "pc.sent", done: Date.now() };
}

export type ReviewContributionState = { ok?: string; error?: string; vars?: Record<string, string> } | undefined;

export async function reviewContribution(id: string, _: ReviewContributionState, fd: FormData): Promise<ReviewContributionState> {
  const admin = await requireAdmin();
  if (!isValidObjectId(id)) return { error: "err.notFound" };
  const decision = String(fd.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") return { error: "err.status" };
  const officeNote = String(fd.get("officeNote") ?? "").trim().slice(0, 500);
  if (decision === "rejected" && !officeNote) return { error: "pc.rejectNeedsNote" };

  await connectDB();
  const c = await Contribution.findById(id);
  if (!c) return { error: "err.notFound" };

  if (decision === "approved" && !c.receiptNo) {
    const year = new Date().getFullYear();
    c.receiptNo = `PC-${year}-${String(await nextSeq(`receipt-${year}`)).padStart(4, "0")}`;
  }
  c.set({ status: decision, officeNote: officeNote || undefined, reviewedBy: admin.id, reviewedAt: new Date() });
  await c.save();

  revalidatePath("/admin/contributions");
  revalidatePath("/contributions");
  return decision === "approved" ? { ok: "pc.approvedMsg", vars: { no: c.receiptNo! } } : { ok: "pc.rejectedMsg" };
}
