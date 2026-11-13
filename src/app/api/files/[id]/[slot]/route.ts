import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Application, type StoredFile } from "@/lib/models";
import { getCurrentUser } from "@/lib/session";
import { readImage } from "@/lib/storage";
import { FILE_SLOTS, type FileSlot } from "@/lib/validation";

// Serves application images only to the applicant and office admins.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; slot: string }> }) {
  const { id, slot } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const app = await Application.findById(id, { user: 1, files: 1 }).lean();
  if (!app || (String(app.user) !== user.id && user.role !== "admin")) {
    return new Response("Not found", { status: 404 });
  }

  let file: StoredFile | undefined | null;
  const m = /^extra-(\d)$/.exec(slot);
  if (m) file = app.files?.extra?.[Number(m[1])];
  else if (slot === "payment") file = app.files?.payment;
  else if ((FILE_SLOTS as readonly string[]).includes(slot)) file = app.files?.[slot as FileSlot];
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const buf = await readImage(file);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[files] read failed", e);
    return new Response("Unavailable", { status: 502 });
  }
}
