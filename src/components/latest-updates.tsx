import Link from "next/link";
import { UpdateCard } from "./update-card";
import { connectDB } from "@/lib/db";
import type { Lang, TFn } from "@/lib/i18n";
import { Update } from "@/lib/models";

/** Profile-page box with the newest office updates. Renders nothing until the office posts one. */
export async function LatestUpdates({ seenAt, t, lang }: { seenAt: Date | null; t: TFn; lang: Lang }) {
  await connectDB();
  const [items, unread] = await Promise.all([
    Update.find({}, { title: 1, body: 1, photo: 1, createdAt: 1 }).sort({ createdAt: -1, _id: -1 }).limit(3).lean(),
    Update.countDocuments(seenAt ? { createdAt: { $gt: seenAt } } : {}),
  ]);
  if (items.length === 0) return null;
  const seen = seenAt?.getTime() ?? 0;

  return (
    <section className="card mt-6 overflow-hidden" aria-labelledby="latest-updates">
      <div className="flex items-center justify-between gap-3 border-b border-sand bg-cream/60 px-4 py-3 sm:px-5">
        <h2 id="latest-updates" className="flex min-w-0 items-center gap-2 text-lg font-extrabold">
          <span className="hidden sm:inline" aria-hidden="true">
            📢
          </span>
          {t("upd.title")}
          {unread > 0 && <span className="chip bg-brand text-white">{unread}</span>}
        </h2>
        <Link href="/updates" className="shrink-0 whitespace-nowrap text-sm font-bold text-brand-dark hover:underline">
          {t("upd.seeAll")}
        </Link>
      </div>
      <ul className="divide-y divide-sand">
        {items.map((u) => (
          <li key={String(u._id)}>
            <Link href="/updates" className="block px-4 py-3 transition hover:bg-cream sm:px-5">
              <UpdateCard u={u} t={t} lang={lang} compact isNew={new Date(u.createdAt).getTime() > seen} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
