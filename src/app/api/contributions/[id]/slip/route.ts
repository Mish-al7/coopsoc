import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { Contribution } from "@/lib/models";
import { getCurrentUser } from "@/lib/session";
import { PDF_MIME, readStored } from "@/lib/storage";

// Bank slip of a project contribution — only for the member who sent it and office admins.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const c = await Contribution.findById(id, { user: 1, slip: 1 }).lean();
  if (!c || (String(c.user) !== user.id && user.role !== "admin")) return new Response("Not found", { status: 404 });

  try {
    const buf = await readStored(c.slip);
    const isPdf = c.slip.mime === PDF_MIME;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": isPdf ? PDF_MIME : "image/jpeg",
        "Content-Disposition": `inline; filename="bank-slip-${id}.${isPdf ? "pdf" : "jpg"}"`,
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[contributions/slip] read failed", e);
    return new Response("Unavailable", { status: 502 });
  }
}
