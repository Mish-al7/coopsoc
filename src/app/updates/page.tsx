import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkUpdatesSeen } from "@/components/mark-updates-seen";
import { PAGE_SIZE, Pager, pageInfo } from "@/components/pager";
import { UpdateCard } from "@/components/update-card";
import { connectDB } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { Update } from "@/lib/models";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("upd.title") };
}

export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/updates");
  const [sp, { t, lang }] = await Promise.all([searchParams, getT()]);
  await connectDB();
  const total = await Update.countDocuments();
  const { page, pages, skip } = pageInfo(sp.page, total);
  const items = await Update.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(PAGE_SIZE).lean();
  // "New" = posted after the member's previous visit (this visit is recorded by <MarkUpdatesSeen />).
  const seen = user.updatesSeenAt?.getTime() ?? 0;

  return (
    <div className="container-x max-w-2xl py-6 sm:py-10">
      <MarkUpdatesSeen />
      <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("nav.back")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("upd.title")}</h1>
      <p className="text-muted">{t("upd.sub")}</p>
      <span className="divider mt-3" aria-hidden="true" />

      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">{t("upd.none")}</div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((u) => (
            <UpdateCard key={String(u._id)} u={u} t={t} lang={lang} isNew={new Date(u.createdAt).getTime() > seen} />
          ))}
        </div>
      )}
      <Pager page={page} pages={pages} total={total} href={(p) => `/updates${p > 1 ? `?page=${p}` : ""}`} t={t} />
    </div>
  );
}
