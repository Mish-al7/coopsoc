import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ReviewForm } from "@/components/review-form";
import { StatusBadge } from "@/components/status-badge";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { formatAadhaar, isValidAadhaar } from "@/lib/aadhaar";
import { fileUrl } from "@/lib/files";
import { DATE_LOCALE } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { Application, User } from "@/lib/models";
import { requireAdmin } from "@/lib/session";
import type { Status } from "@/lib/society";
import { formatRupees } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.title") };
}

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words font-semibold">{children || "—"}</dd>
    </div>
  );
}

function AadhaarValue({ n }: { n: string }) {
  const ok = isValidAadhaar(n);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tracking-[0.1em]">{formatAadhaar(n)}</span>
      <span className={`chip ${ok ? "bg-leaf-soft text-leaf" : "bg-danger-soft text-danger"}`}>{ok ? "checksum ✓" : "checksum ✗"}</span>
    </span>
  );
}

function Doc({ href, label, tall }: { href?: string; label: string; tall?: boolean }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <div className={`${tall ? "aspect-[3/4]" : "aspect-[4/3]"} overflow-hidden rounded-xl border border-sand bg-cream`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={label} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-[1.02]" />
      </div>
      <p className="mt-1 text-center text-sm font-semibold">{label} ↗</p>
    </a>
  );
}

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const [{ id }, { t, lang }] = await Promise.all([params, getT()]);
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  const app = await Application.findById(id).lean();
  if (!app) notFound();
  const owner = await User.findById(app.user, { email: 1 }).lean();

  const f = app.files;
  const fmt = (d?: Date | null) =>
    d ? new Date(d).toLocaleString(DATE_LOCALE[lang], { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";
  const status = app.status as Status;

  return (
    <div className="container-x py-6 sm:py-10">
      <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("admin.back")}
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{app.name}</h1>
          <p className="break-words text-sm text-muted">
            {app.applicationNo} · {t("dash.submittedOn")} {fmt(app.submittedAt)} · {owner?.email}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} label={t(`status.${status}`)} />
          <Link href={`/application/${id}`} className="btn btn-ghost btn-sm">
            {t("admin.formPrint")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {(f?.payment || (app.payment?.amount ?? 0) > 0) && (
            <section className="card p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{t("admin.paymentSection")}</h2>
                {app.payment?.verified && <span className="chip bg-leaf-soft text-leaf">{t("admin.paymentOk")}</span>}
              </div>
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
                {f?.payment ? <Doc href={fileUrl(id, "payment", f.payment)} label={t("pay.screenshot")} tall /> : <p className="alert alert-warn">{t("admin.noPayment")}</p>}
                <dl className="grid gap-3 rounded-xl bg-cream p-3">
                  <Item label={t("admin.paidAmount")}>{app.payment?.amount != null ? formatRupees(app.payment.amount) : "—"}</Item>
                  <Item label={t("admin.paymentRef")}>
                    <span className="tracking-wide">{app.payment?.ref}</span>
                  </Item>
                </dl>
              </div>
            </section>
          )}

          <section className="card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("admin.aadhaarSection")}</h2>
            <div className="mb-4 rounded-xl bg-cream p-3">
              <p className="text-xs text-muted">{t("admin.aadhaarOnForm")}</p>
              <div className="text-lg font-bold">
                <AadhaarValue n={decrypt(app.aadhaarEnc)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Doc href={fileUrl(id, "photo", f?.photo)} label={t("f.photo")} />
              <Doc href={fileUrl(id, "aadhaarFront", f?.aadhaarFront)} label={t("f.aadhaarFront")} />
              <Doc href={fileUrl(id, "aadhaarBack", f?.aadhaarBack)} label={t("f.aadhaarBack")} />
              <Doc href={fileUrl(id, "signature", f?.signature)} label={t("f.signature")} />
              {(f?.extra ?? []).map((e, i) => (
                <Doc key={i} href={fileUrl(id, `extra-${i}`, e)} label={t("f.extraN", { n: i + 1 })} />
              ))}
            </div>
          </section>

          <section className="card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("admin.applicant")}</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Item label={t("f.name")}>{app.name}</Item>
              <Item label={t("f.guardian")}>{app.guardianName && `${app.guardianName} (${t(`rel.${app.guardianRelation}`)})`}</Item>
              <Item label={t("f.age")}>{app.age}</Item>
              <Item label={t("f.occupation")}>{app.occupation}</Item>
              <Item label={t("f.phone")}>
                <a href={`tel:${app.phone}`} className="text-brand-dark underline-offset-2 hover:underline">
                  {app.phone}
                </a>
              </Item>
              <Item label={t("f.shares")}>{app.shares}</Item>
              <Item label={t("f.address")} wide>
                <span className="whitespace-pre-line">{app.address}</span>
              </Item>
              <Item label={t("f.desam")}>{app.desam}</Item>
              <Item label={t("f.village")}>{app.village}</Item>
              <Item label={t("f.taluk")}>{app.taluk}</Item>
            </dl>
          </section>

          <section className="card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("sec.bank")}</h2>
            {app.bank?.accountEnc ? (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Item label={t("f.bankHolder")} wide>
                  {app.bank.holderName}
                </Item>
                <Item label={t("f.bankAccount")}>
                  <span className="tracking-[0.08em]">{decrypt(app.bank.accountEnc)}</span>
                </Item>
                <Item label={t("f.ifsc")}>
                  <span className="tracking-[0.08em]">{app.bank.ifsc}</span>
                </Item>
                <Item label={t("f.bankName")}>{app.bank.bankName}</Item>
                <Item label={t("f.bankBranch")}>{app.bank.branch}</Item>
              </dl>
            ) : (
              <p className="text-muted">—</p>
            )}
          </section>

          <section className="card p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">{t("sec.nominee")}</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Item label={t("f.nomineeName")}>{app.nominee?.name}</Item>
              <Item label={t("f.nomineeRelation")}>{app.nominee?.relation}</Item>
              <Item label={t("f.age")}>{app.nominee?.age}</Item>
              <Item label={t("f.phone")}>{app.nominee?.phone}</Item>
              <Item label={t("f.aadhaar")} wide>
                <AadhaarValue n={decrypt(app.nominee?.aadhaarEnc)} />
              </Item>
              <Item label={t("f.nomineeAddress")} wide>
                <span className="whitespace-pre-line">{app.nominee?.address}</span>
              </Item>
            </dl>
            {(f?.nomineePhoto || f?.nomineeAadhaarFront || f?.nomineeAadhaarBack) && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Doc href={fileUrl(id, "nomineePhoto", f?.nomineePhoto)} label={t("f.nomineePhoto")} />
                <Doc href={fileUrl(id, "nomineeAadhaarFront", f?.nomineeAadhaarFront)} label={t("f.nomineeAadhaarFront")} />
                <Doc href={fileUrl(id, "nomineeAadhaarBack", f?.nomineeAadhaarBack)} label={t("f.nomineeAadhaarBack")} />
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className="card p-4 sm:p-5">
            <h2 className="mb-4 text-lg font-bold">{t("view.officeNote")}</h2>
            <ReviewForm
              id={id}
              initial={{
                status,
                aadhaarVerified: !!app.aadhaarVerified,
                officeNote: app.officeNote ?? "",
                membershipNo: app.membershipNo ?? "",
                hasPayment: !!f?.payment?.key,
                paymentVerified: !!app.payment?.verified,
              }}
            />
            {app.reviewedAt && (
              <p className="mt-3 text-xs text-muted">
                {t("admin.lastChanged")}: {fmt(app.reviewedAt)}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
