import type { Metadata } from "next";
import Link from "next/link";
import { ContributionBadge, formatDateTime, rupees, SlipThumb } from "@/components/contribution-bits";
import { ContributionReview } from "@/components/contribution-review";
import { PAGE_SIZE, Pager, pageInfo } from "@/components/pager";
import { connectDB } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { Application, Contribution, CONTRIBUTION_STATUSES, type ContributionStatus } from "@/lib/models";
import { requireAdmin } from "@/lib/session";
import { PDF_MIME } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("pc.adminTitle") };
}

export default async function AdminContributionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const [sp, { t, lang }] = await Promise.all([searchParams, getT()]);
  // Pending first by default — that's the office's to-do list.
  const status: ContributionStatus | "all" =
    sp.status === "all" ? "all" : (CONTRIBUTION_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as ContributionStatus) : "pending";

  await connectDB();
  const filter = status === "all" ? {} : { status };
  const counts = await Contribution.aggregate<{ _id: ContributionStatus; n: number; sum: number }>([
    { $group: { _id: "$status", n: { $sum: 1 }, sum: { $sum: "$amount" } } },
  ]);
  const matching = status === "all" ? counts.reduce((a, c) => a + c.n, 0) : (counts.find((c) => c._id === status)?.n ?? 0);
  const { page, pages, skip } = pageInfo(sp.page, matching);
  const items = await Contribution.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(PAGE_SIZE).lean();
  const listHref = (pg: number) => `/admin/contributions?status=${status}${pg > 1 ? `&page=${pg}` : ""}`;
  const apps = await Application.find({ _id: { $in: items.map((c) => c.application) } }, { name: 1, membershipNo: 1, phone: 1 }).lean();
  const appById = new Map(apps.map((a) => [String(a._id), a]));
  const count = Object.fromEntries(counts.map((c) => [c._id, c])) as Partial<Record<ContributionStatus, { n: number; sum: number }>>;
  const all = counts.reduce((a, c) => a + c.n, 0);
  const tabCls = (active: boolean) => `chip shrink-0 border px-3.5 py-1.5 ${active ? "border-ink bg-ink text-white" : "border-sand-2 bg-paper text-ink"}`;

  return (
    <div className="container-x py-6 sm:py-10">
      <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("admin.back")}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("pc.adminTitle")}</h1>
          {count.approved && (
            <p className="text-muted">
              {t("pc.total")}: <span className="font-extrabold text-leaf">{rupees(count.approved.sum)}</span>
            </p>
          )}
        </div>
      </div>

      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {CONTRIBUTION_STATUSES.map((s) => (
          <Link key={s} href={`/admin/contributions?status=${s}`} className={tabCls(status === s)}>
            {t(`pc.st.${s}`)} · {count[s]?.n ?? 0}
          </Link>
        ))}
        <Link href="/admin/contributions?status=all" className={tabCls(status === "all")}>
          {t("pc.all")} · {all}
        </Link>
      </nav>

      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">{t("admin.none")}</div>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {items.map((c) => {
            const id = String(c._id);
            const a = appById.get(String(c.application));
            const st = c.status as ContributionStatus;
            return (
              <li key={id} className="card p-4">
                <div className="flex gap-3">
                  <SlipThumb id={id} isPdf={c.slip?.mime === PDF_MIME} label={t("pc.viewSlip")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xl font-extrabold">{rupees(c.amount)}</p>
                      <ContributionBadge status={st} label={t(`pc.st.${st}`)} />
                    </div>
                    <p className="truncate font-semibold">
                      {a ? (
                        <Link href={`/admin/applications/${String(c.application)}`} className="hover:text-brand-dark hover:underline">
                          {a.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {a?.membershipNo && <span className="ml-1 text-sm font-normal text-muted">· {a.membershipNo}</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDateTime(c.createdAt, lang)}
                      {c.ref && <> · {c.ref}</>}
                    </p>
                    <a href={`/api/contributions/${id}/slip`} target="_blank" rel="noopener" className="text-sm font-semibold text-brand-dark hover:underline">
                      {t("pc.viewSlip")} ↗
                    </a>
                  </div>
                </div>

                <div className="mt-3 border-t border-sand pt-3">
                  {st === "approved" && c.receiptNo ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        {t("rc.no")} <b>{c.receiptNo}</b>
                      </p>
                      <Link href={`/contributions/${id}/receipt`} className="btn btn-ghost btn-sm">
                        {t("pc.colReceipt")} ↗
                      </Link>
                    </div>
                  ) : (
                    <ContributionReview id={id} note={c.officeNote ?? ""} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} pages={pages} total={matching} href={listHref} t={t} />
    </div>
  );
}
