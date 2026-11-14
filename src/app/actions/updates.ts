"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Update, User } from "@/lib/models";
import { requireAdmin, requireUser } from "@/lib/session";
import { deleteImage, isRealImage, saveImage } from "@/lib/storage";

/** Values are i18n keys. `done` changes on every successful post so the form can clear itself. */
export type UpdateFormState = { ok?: string; error?: string; errors?: Record<string, string>; done?: number } | undefined;

const MAX_TITLE = 120;
const MAX_BODY = 3000;

function refresh() {
  revalidatePath("/updates");
  revalidatePath("/dashboard");
  revalidatePath("/admin/updates");
}

export async function postUpdate(_: UpdateFormState, fd: FormData): Promise<UpdateFormState> {
  const admin = await requireAdmin();
  const title = String(fd.get("title") ?? "").trim().slice(0, MAX_TITLE);
  const body = String(fd.get("body") ?? "").trim().slice(0, MAX_BODY);
  const photo = fd.get("photo");

  const errors: Record<string, string> = {};
  if (!title) errors.title = "v.updTitle";
  if (isRealImage(photo) && !photo.type.startsWith("image/")) errors.photo = "v.updPhoto";
  if (Object.keys(errors).length) return { error: "form.fixSummary", errors };

  await connectDB();
  let stored;
  try {
    if (isRealImage(photo)) stored = await saveImage(photo, "updates");
    await Update.create({ title, body: body || undefined, photo: stored, createdBy: admin.id });
  } catch (e) {
    if (stored) await deleteImage(stored);
    console.error("[updates] save failed", e);
    const msg = e instanceof Error && e.message.startsWith("err.") ? e.message : "err.saveFailed";
    return { error: msg };
  }

  refresh();
  return { ok: "upd.posted", done: Date.now() };
}

export async function deleteUpdate(id: string) {
  await requireAdmin();
  if (!isValidObjectId(id)) return;
  await connectDB();
  const u = await Update.findById(id, { photo: 1 }).lean();
  if (!u) return;
  await Update.deleteOne({ _id: id });
  // Removing the photo from Cloudinary can take a few seconds — don't make the office wait for it.
  if (u.photo) after(() => deleteImage(u.photo));
  refresh();
}

/** Called once when a member opens /updates, so the "new" badge clears next time. */
export async function markUpdatesSeen() {
  const user = await requireUser();
  await connectDB();
  await User.updateOne({ _id: user.id }, { $set: { updatesSeenAt: new Date() } });
}
