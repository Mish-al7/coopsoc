import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { readImage } from "@/lib/storage";

// The society's payment QR. Shown to any logged-in user (applicants need it to pay).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const s = await getSettings();
  if (!s.qr) return new Response("Not found", { status: 404 });
  try {
    const buf = await readImage(s.qr);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": 'inline; filename="thwics-payment-qr.jpg"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[settings/qr] read failed", e);
    return new Response("Unavailable", { status: 502 });
  }
}
