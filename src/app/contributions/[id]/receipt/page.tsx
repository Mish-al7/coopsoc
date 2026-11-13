import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Emblem } from "@/components/emblem";
import { formatDateTime, rupees } from "@/components/contribution-bits";
import { ReceiptPrintButton } from "@/components/receipt-print-button";
import { connectDB } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { Application, Contribution } from "@/lib/models";
import { rupeesInWords } from "@/lib/numwords";
import { requireUser } from "@/lib/session";
import { SOCIETY } from "@/lib/society";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("rc.title") };
}

function Line({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <p className="py-1.5 leading-relaxed">
      <span className="text-muted print:text-ink">{label} : </span>
      <span className={strong ? "font-extrabold" : "font-semibold"}>{children}</span>
    </p>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { t, lang } = await getT();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const c = await Contribution.findById(id).lean();
  if (!c || (String(c.user) !== user.id && user.role !== "admin")) notFound();
  const app = await Application.findById(c.application, { name: 1, membershipNo: 1, phone: 1 }).lean();
  const back = user.role === "admin" ? "/admin/contributions" : "/contributions";

  if (c.status !== "approved" || !c.receiptNo) {
    return (
      <div className="container-x max-w-2xl py-10">
        <p className="alert alert-warn">{t("rc.notReady")}</p>
        <Link href={back} className="btn btn-ghost mt-4">
          {t("nav.back")}
        </Link>
      </div>
    );
  }

  const name = app?.name ?? "—";
  return (
    <div className="container-x max-w-3xl py-6 sm:py-10 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={back} className="text-sm font-semibold text-muted hover:text-brand-dark">
          {t("nav.back")}
        </Link>
        <ReceiptPrintButton label={t("rc.download")} />
      </div>
      <p className="no-print mb-4 text-xs text-muted">{t("rc.pdfHint")}</p>

      <article className="card relative overflow-hidden p-5 sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <div className="bg-flame absolute inset-x-0 top-0 h-1.5 print:hidden" aria-hidden="true" />

        <h1 className="text-center text-3xl font-extrabold tracking-wide sm:text-4xl">
          {lang === "ml" ? (
            <>
              RECEIPT <span className="block text-lg font-bold text-muted sm:text-xl">{t("rc.title")}</span>
            </>
          ) : (
            "RECEIPT"
          )}
        </h1>

        {/* Society block (right, like the reference) */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center sm:ml-auto sm:max-w-sm sm:items-end sm:text-right">
          <Emblem className="h-20 w-20 sm:h-24 sm:w-24" />
          <p className="text-lg font-extrabold leading-snug text-maroon">{t("society.name")}</p>
          <div className="text-sm leading-relaxed text-muted print:text-ink">
            <p>{t("society.address")}</p>
            <p>{SOCIETY.email}</p>
            <p>{SOCIETY.phones.join(", ")}</p>
            <p className="mt-1 font-bold text-ink">
              {t("society.regNo")} {SOCIETY.regNo}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-sand pt-5 print:border-ink/40">
          <p className="font-semibold">
            {t("rc.no")} <span className="font-extrabold">{c.receiptNo}</span>
          </p>
          <p className="mt-1 text-sm font-bold">
            {t("rc.dated")} : {formatDateTime(c.reviewedAt ?? c.updatedAt, lang)}
          </p>
        </div>

        <div className="mt-6">
          <Line label={t("rc.receivedFrom")} strong>
            {name}
            {app?.membershipNo && <span className="ml-1 font-semibold text-muted">({t("dash.memberNo")} {app.membershipNo})</span>}
          </Line>
          <Line label={t("rc.amount")} strong>
            {rupees(c.amount)}
          </Line>
          <Line label={t("rc.inWords")}>{rupeesInWords(c.amount)}</Line>
          <Line label={t("rc.remark")}>{t("rc.remarkText", { name })}</Line>
          {c.ref && <Line label={t("rc.ref")}>{c.ref}</Line>}
          <Line label={t("rc.paidOn")}>{formatDateTime(c.createdAt, lang)}</Line>
        </div>

        <p className="mt-14 text-right text-sm text-muted print:text-ink">{t("rc.computer")}</p>
      </article>
    </div>
  );
}
