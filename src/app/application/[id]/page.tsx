import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Emblem } from "@/components/emblem";
import { PrintButton } from "@/components/print-button";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { formatAadhaar } from "@/lib/aadhaar";
import { fileUrl } from "@/lib/files";
import { getT } from "@/lib/i18n-server";
import { Application } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { SOCIETY, type Status } from "@/lib/society";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("form.title") };
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-3 py-1.5 sm:grid-cols-[15rem_1fr] print:grid-cols-[15rem_1fr]">
      <dt className="text-sm text-muted sm:text-[0.95rem] print:text-ink">{label}</dt>
      <dd className="min-w-0 break-words border-b border-dotted border-sand-2 font-semibold">
        <span className="mr-2 font-normal text-muted">:</span>
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function ApplicationView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { t } = await getT();
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const app = await Application.findById(id).lean();
  if (!app || (String(app.user) !== user.id && user.role !== "admin")) notFound();

  const photo = fileUrl(id, "photo", app.files?.photo);
  const sign = fileUrl(id, "signature", app.files?.signature);
  const date = app.submittedAt
    ? new Date(app.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" })
    : "";
  const status = app.status as Status;
  const guardian = app.guardianName ? `${app.guardianName} (${t(`rel.${app.guardianRelation}`)})` : "";

  return (
    <div className="container-x max-w-4xl py-6 sm:py-10 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link href={user.role === "admin" ? `/admin/applications/${id}` : "/dashboard"} className="text-sm font-semibold text-muted hover:text-brand-dark">
          {t("nav.back")}
        </Link>
        <PrintButton />
      </div>

      <article className="card p-4 sm:p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start gap-3 border-b-2 border-ink/80 pb-3 text-center sm:gap-4">
          <Emblem className="h-12 w-12 shrink-0 sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold leading-snug sm:text-xl">
              {t("society.name")} {t("society.regNo")} {SOCIETY.regNo}
            </p>
            <p className="text-xs text-muted sm:text-sm">{t("society.address")}</p>
            <p className="text-xs text-muted sm:text-sm">
              {t("footer.headOffice")}: {SOCIETY.phones.join(", ")}
            </p>
          </div>
        </header>

        <div className="my-5 flex flex-col-reverse items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="inline-block rounded-xl border-2 border-ink/80 px-4 py-1 text-lg font-bold sm:text-2xl">{t("form.title")}</h1>
            <p className="mt-2 text-sm text-muted">
              {t("dash.appNo")}: <b className="text-ink">{app.applicationNo}</b>
            </p>
          </div>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={t("f.photo")} className="h-36 w-28 rounded-md border border-ink/40 object-cover" />
          ) : (
            // The photo is optional — leave a box on the printout to paste one in.
            <div className="flex h-36 w-28 items-center justify-center rounded-md border-2 border-dashed border-ink/40 text-sm text-muted">{t("f.photo")}</div>
          )}
        </div>

        <dl>
          <Row label={t("f.name")} value={app.name} />
          <Row label={t("f.address")} value={<span className="whitespace-pre-line">{app.address}</span>} />
          <Row label={t("f.phone")} value={app.phone} />
          <Row label={t("f.guardian")} value={guardian} />
          <Row label={t("f.taluk")} value={app.taluk} />
          <Row label={t("f.village")} value={app.village} />
          <Row label={t("f.desam")} value={app.desam} />
          <Row label={t("f.age")} value={app.age} />
          <Row label={t("f.occupation")} value={app.occupation} />
          <Row label={t("f.aadhaar")} value={formatAadhaar(decrypt(app.aadhaarEnc))} />
        </dl>

        {app.bank?.accountEnc && (
          <>
            <p className="mt-5 font-semibold">{t("sec.bank")}</p>
            <dl>
              <Row label={t("f.bankHolder")} value={app.bank.holderName} />
              <Row label={t("f.bankAccount")} value={decrypt(app.bank.accountEnc)} />
              <Row label={t("f.ifsc")} value={app.bank.ifsc} />
              <Row label={t("f.bankName")} value={app.bank.bankName} />
              <Row label={t("f.bankBranch")} value={app.bank.branch} />
            </dl>
          </>
        )}

        <p className="mt-5 font-semibold">{t("view.nomineeHeading")}</p>
        <dl>
          <Row label={t("f.nomineeName")} value={app.nominee?.name} />
          <Row label={t("f.nomineeAddress")} value={<span className="whitespace-pre-line">{app.nominee?.address}</span>} />
          <Row label={t("f.age")} value={app.nominee?.age} />
          <Row label={t("f.phone")} value={app.nominee?.phone} />
          <Row label={t("f.aadhaar")} value={formatAadhaar(decrypt(app.nominee?.aadhaarEnc))} />
          <Row label={t("f.nomineeRelation")} value={app.nominee?.relation} />
          <Row label={t("f.shares")} value={app.shares} />
        </dl>

        <div className="mt-6">
          <p>{t("decl.sir")}</p>
          <p className="indent-8 leading-relaxed">{t("decl.text")}</p>
          <p className="mt-2 text-right">{t("view.and")}</p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-sm">
            <p>{t("society.place")}</p>
            <p>
              {t("view.date")} : {date}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm">{t("view.applicant")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {sign ? <img src={sign} alt={t("f.signature")} className="mx-auto h-16 max-w-[10rem] object-contain mix-blend-multiply" /> : <div className="h-16" />}
            <p className="text-sm">{t("f.signature")}</p>
          </div>
        </div>

        <section className="mt-6 border-t-2 border-ink/80 pt-3">
          <p className="text-center font-semibold">{t("view.officeNote")}</p>
          <dl className="mt-2">
            <Row label={t("view.status")} value={t(`status.${status}`)} />
            <Row label={t("view.aadhaarCheck")} value={app.aadhaarVerified ? t("view.verified") : t("view.notVerified")} />
            <Row label={t("dash.memberNo")} value={app.membershipNo} />
            <Row label={t("view.note")} value={app.officeNote && <span className="whitespace-pre-line">{app.officeNote}</span>} />
          </dl>
          <div className="mt-12 flex justify-between text-xs font-semibold uppercase text-muted sm:text-sm">
            <span>{t("view.president")}</span>
            <span>{t("view.secretary")}</span>
          </div>
        </section>
      </article>
    </div>
  );
}
