import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, Pager, pageInfo } from "@/components/pager";
import { UpdateCard } from "@/components/update-card";
import { DeleteUpdateButton, UpdateForm } from "@/components/update-form";
import { connectDB } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { Update } from "@/lib/models";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("upd.title") };
}

export default async function AdminUpdatesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const [sp, { t, lang }] = await Promise.all([searchParams, getT()]);
  await connectDB();
  const total = await Update.countDocuments();
  const { page, pages, skip } = pageInfo(sp.page, total);
  const items = await Update.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(PAGE_SIZE).lean();

  return (
    <div className="container-x max-w-5xl py-6 sm:py-10">
      <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("admin.back")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("upd.title")}</h1>
      <p className="text-muted">{t("upd.adminSub")}</p>
      <span className="divider mt-3" aria-hidden="true" />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
        <section className="card p-4 sm:p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-lg font-bold">{t("upd.formTitle")}</h2>
          <UpdateForm />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">
            {t("upd.list")} · {total}
          </h2>
          {items.length === 0 ? (
            <div className="card p-10 text-center text-muted">{t("upd.none")}</div>
          ) : (
            <div className="space-y-4">
              {items.map((u) => (
                <UpdateCard key={String(u._id)} u={u} t={t} lang={lang} footer={<DeleteUpdateButton id={String(u._id)} />} />
              ))}
            </div>
          )}
          <Pager page={page} pages={pages} total={total} href={(p) => `/admin/updates${p > 1 ? `?page=${p}` : ""}`} t={t} />
        </section>
      </div>
    </div>
  );
}
