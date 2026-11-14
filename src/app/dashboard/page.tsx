import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LatestUpdates } from "@/components/latest-updates";
import { StatusBadge } from "@/components/status-badge";
import { connectDB } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { DATE_LOCALE } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { Application } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { formatRupees } from "@/lib/settings";
import { SOCIETY, type Status } from "@/lib/society";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.myApp") };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  const [{ saved }, { t, lang }] = await Promise.all([searchParams, getT()]);
  await connectDB();
  const app = await Application.findOne({ user: user.id }).lean();

  const fmt = (d?: Date | null) =>
    d ? new Date(d).toLocaleDateString(DATE_LOCALE[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

  if (!app) {
    return (
      <div className="container-x max-w-2xl py-8 sm:py-14">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("dash.hello", { name: user.name })}</h1>
        <LatestUpdates seenAt={user.updatesSeenAt} t={t} lang={lang} />
        <div className="card mt-6 p-6 text-center sm:p-10">
          <p className="font-display text-xl font-semibold">{t("dash.noneTitle")}</p>
          <p className="mt-2 text-muted">{t("dash.noneText")}</p>
          <Link href="/apply" className="btn btn-primary mt-6 w-full sm:w-auto">
            {t("dash.fillCta")}
          </Link>
        </div>
      </div>
    );
  }

  const id = String(app._id);
  const status = app.status as Status;
  const editable = status === "submitted" || status === "needs_changes";
  const steps = [
    { label: t("dash.step1"), done: true },
    { label: t("dash.step2"), done: status !== "submitted" && status !== "needs_changes", current: status === "submitted" || status === "needs_changes" },
    { label: status === "rejected" ? t("dash.step3rejected") : t("dash.step3"), done: status === "approved" || status === "rejected" },
  ];
  const photo = fileUrl(id, "photo", app.files?.photo);

  return (
    <div className="container-x max-w-3xl py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("dash.hello", { name: user.name })}</h1>

      {saved && <p className="alert alert-ok mt-4">{t("dash.saved")}</p>}

      <LatestUpdates seenAt={user.updatesSeenAt} t={t} lang={lang} />

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="" className="h-20 w-16 shrink-0 rounded-xl border border-sand object-cover sm:h-24 sm:w-20" />}
          <div className="min-w-0 flex-1">
            <StatusBadge status={status} label={t(`status.${status}`)} />
            <p className="mt-2 font-display text-xl font-bold">{app.name}</p>
            <p className="text-sm text-muted">
              {t("dash.appNo")} <span className="font-semibold text-ink">{app.applicationNo}</span>
            </p>
            <p className="text-sm text-muted">
              {t("dash.submittedOn")}: {fmt(app.submittedAt)}
            </p>
            {app.files?.payment && app.payment?.amount != null && (
              <p className="text-sm text-muted">
                {t("dash.fee")}: <span className="font-semibold text-ink">{formatRupees(app.payment.amount)}</span> ·{" "}
                <span className={app.payment.verified ? "font-semibold text-leaf" : ""}>{app.payment.verified ? t("dash.feeOk") : t("dash.feePending")}</span>
              </p>
            )}
            {status === "approved" && app.membershipNo && (
              <p className="mt-2 inline-block rounded-lg bg-leaf-soft px-3 py-1 font-semibold text-leaf">
                {t("dash.memberNo")}: {app.membershipNo}
              </p>
            )}
          </div>
        </div>

        <ol className="grid grid-cols-3 border-t border-sand bg-cream/60 px-2 py-4 text-center text-xs sm:text-sm">
          {steps.map((s, i) => (
            <li key={i} className="relative flex flex-col items-center gap-1.5 px-1">
              {i > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${s.done || s.current ? "bg-brand" : "bg-sand-2"}`} />}
              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  s.done ? "bg-brand text-white" : s.current ? "bg-paper text-brand ring-2 ring-brand" : "bg-sand text-muted"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <span className={s.done || s.current ? "font-semibold text-ink" : "text-muted"}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {app.officeNote && status !== "submitted" && (
        <div className={`alert mt-4 ${status === "approved" ? "alert-ok" : "alert-warn"}`}>
          <p className="font-semibold">{t("dash.officeNote")}</p>
          <p className="whitespace-pre-line">{app.officeNote}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {editable && (
          <Link href="/apply" className={`btn ${status === "needs_changes" ? "btn-primary" : "btn-ghost"}`}>
            {status === "needs_changes" ? t("dash.fix") : t("dash.edit")}
          </Link>
        )}
        <Link href={`/application/${id}`} className="btn btn-ghost">
          {t("dash.view")}
        </Link>
      </div>

      {status === "approved" && (
        <Link
          href="/contributions"
          className="card mt-6 flex items-center gap-4 p-4 transition hover:border-brand/50 hover:shadow-md sm:p-5"
        >
          <span className="icon-bubble shrink-0 text-xl font-extrabold" aria-hidden="true">
            ₹
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">{t("pc.title")}</span>
            <span className="block text-sm text-muted">{t("pc.dashCard")}</span>
          </span>
          <span className="text-2xl text-muted" aria-hidden="true">
            ›
          </span>
        </Link>
      )}

      <p className="mt-8 text-sm text-muted">
        {t("dash.help")}{" "}
        {SOCIETY.phones.map((p, i) => (
          <span key={p}>
            {i > 0 && ", "}
            <a href={`tel:${p.replace(/\s/g, "")}`} className="font-semibold text-brand-dark">
              {p}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
