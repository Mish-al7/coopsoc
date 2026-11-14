import type { Metadata } from "next";
import Link from "next/link";
import { PAGE_SIZE, Pager, pageInfo } from "@/components/pager";
import { StatusBadge } from "@/components/status-badge";
import { connectDB } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getT } from "@/lib/i18n-server";
import { Application, Contribution } from "@/lib/models";
import { requireAdmin } from "@/lib/session";
import { STATUSES, type Status } from "@/lib/society";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.title") };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const admin = await requireAdmin();
  const [sp, { t }] = await Promise.all([searchParams, getT()]);
  const q = (sp.q ?? "").trim().slice(0, 60);
  // With no tab picked, open on "Submitted" — the office's to-do list. A search with no tab looks through everything.
  const status: Status | "all" =
    sp.status === "all" ? "all" : (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as Status) : q ? "all" : "submitted";

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    const or: Record<string, unknown>[] = [{ name: re }, { phone: re }, { applicationNo: re }, { membershipNo: re }];
    if (/^\d{4}$/.test(q)) or.push({ aadhaarLast4: q });
    filter.$or = or;
  }
  const [matching, counts, pendingContributions] = await Promise.all([
    Application.countDocuments(filter),
    Application.aggregate<{ _id: Status; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Contribution.countDocuments({ status: "pending" }),
  ]);
  const { page, pages, skip } = pageInfo(sp.page, matching);
  const apps = await Application.find(filter, { name: 1, phone: 1, applicationNo: 1, status: 1, submittedAt: 1, aadhaarVerified: 1, payment: 1, files: 1 })
    .sort({ submittedAt: -1, _id: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean();
  const count = Object.fromEntries(counts.map((c) => [c._id, c.n])) as Record<Status, number>;
  const total = counts.reduce((a, c) => a + c.n, 0);

  const listHref = (s: Status | "all", pg = 1) => {
    const p = new URLSearchParams({ status: s });
    if (q) p.set("q", q);
    if (pg > 1) p.set("page", String(pg));
    return `/admin?${p}`;
  };
  const tabHref = (s: Status | "all") => listHref(s);
  const tabCls = (active: boolean) => `chip shrink-0 border px-3.5 py-1.5 ${active ? "border-ink bg-ink text-white" : "border-sand-2 bg-paper text-ink"}`;

  return (
    <div className="container-x py-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("admin.title")}</h1>
          <p className="text-muted">{t("admin.total", { n: total })}</p>
        </div>
        <form className="flex w-full gap-2 sm:w-auto" action="/admin">
          {sp.status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder={t("admin.searchPh")} className="input min-w-0 flex-1 sm:w-72" type="search" />
          <button className="btn btn-ghost shrink-0">{t("admin.search")}</button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/contributions" className="btn btn-ghost btn-sm">
          ₹ {t("admin.contributions")}
          {pendingContributions > 0 && <span className="chip bg-brand text-white">{pendingContributions}</span>}
        </Link>
        <Link href="/admin/updates" className="btn btn-ghost btn-sm">
          📢 {t("nav.updates")}
        </Link>
        {admin.superAdmin && (
          <Link href="/admin/settings" className="btn btn-ghost btn-sm">
            ⚙ {t("nav.settings")}
          </Link>
        )}
      </div>

      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={tabHref("all")} className={tabCls(status === "all")}>
          {t("admin.all")} · {total}
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={tabHref(s)} className={tabCls(status === s)}>
            {t(`status.${s}`)} · {count[s] ?? 0}
          </Link>
        ))}
      </nav>

      {apps.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">{t("admin.none")}</div>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((a) => {
            const id = String(a._id);
            const photo = fileUrl(id, "photo", a.files?.photo);
            return (
              <li key={id}>
                <Link href={`/admin/applications/${id}`} className="card flex items-center gap-3 p-3 transition hover:border-brand/50 hover:shadow-md sm:p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {photo ? <img src={photo} alt="" loading="lazy" className="h-16 w-14 shrink-0 rounded-lg bg-sand object-cover" /> : <span className="h-16 w-14 shrink-0 rounded-lg bg-sand" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold leading-tight">{a.name}</p>
                    <p className="truncate text-sm text-muted">
                      {a.applicationNo} · {a.phone}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.status as Status} label={t(`status.${a.status}`)} />
                      {a.aadhaarVerified && <span className="chip bg-leaf-soft text-leaf">{t("admin.aadhaarOk")}</span>}
                      {a.payment?.verified && <span className="chip bg-leaf-soft text-leaf">{t("admin.paymentOk")}</span>}
                    </div>
                  </div>
                  <span className="text-xl text-muted">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pages={pages} total={matching} href={(p) => listHref(status, p)} t={t} />
    </div>
  );
}
