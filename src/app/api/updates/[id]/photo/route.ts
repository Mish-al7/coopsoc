import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Update } from "@/lib/models";
import { getCurrentUser } from "@/lib/session";
import { readImage } from "@/lib/storage";

// Photo of an office update — any logged-in member or admin may see it.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const u = await Update.findById(id, { photo: 1 }).lean();
  if (!u?.photo) return new Response("Not found", { status: 404 });

  try {
    const buf = await readImage(u.photo);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        // An update's photo never changes (updates are deleted, not edited).
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[updates/photo] read failed", e);
    return new Response("Unavailable", { status: 502 });
  }
}
