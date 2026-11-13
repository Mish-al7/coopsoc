import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContributionBadge, formatDateTime, rupees, SlipThumb } from "@/components/contribution-bits";
import { ContributionForm } from "@/components/contribution-form";
import { connectDB } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { Application, Contribution, type ContributionStatus } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { getSettings, qrUrl } from "@/lib/settings";
import { PDF_MIME } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("pc.title") };
}

export default async function ContributionsPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin/contributions");
  const [{ t, lang }, settings] = await Promise.all([getT(), getSettings()]);
  await connectDB();
  const app = await Application.findOne({ user: user.id }, { status: 1, membershipNo: 1 }).lean();
  const isMember = app?.status === "approved";
  const items = isMember ? await Contribution.find({ user: user.id }).sort({ createdAt: -1 }).lean() : [];
  const total = items.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const qr = qrUrl(settings);
  const hasBank = !!(settings.payeeName || settings.bankDetails || settings.upiId || qr);

  return (
    <div className="container-x max-w-4xl py-6 sm:py-10">
      <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("nav.back")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("pc.title")}</h1>
      <p className="text-muted">{t("pc.sub")}</p>
      <span className="divider mt-3" aria-hidden="true" />

      {!isMember ? (
        <p className="alert alert-warn mt-6">{t("pc.membersOnly")}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-[22rem_1fr]">
            {/* Where to pay — the same account / QR the super admin set for the fee */}
            <section className="card overflow-hidden">
              <div className="bg-flame px-4 py-3 text-white sm:px-5">
                <h2 className="text-lg font-bold">{t("pc.bankTitle")}</h2>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {!hasBank && <p className="text-muted">{t("pc.noBank")}</p>}
                {settings.payeeName && (
                  <div>
                    <p className="text-xs text-muted">{t("set.payee")}</p>
                    <p className="font-bold">{settings.payeeName}</p>
                  </div>
                )}
                {settings.bankDetails && (
                  <div>
                    <p className="text-xs text-muted">{t("pay.bank")}</p>
                    <p className="whitespace-pre-line font-semibold">{settings.bankDetails}</p>
                  </div>
                )}
                {settings.upiId && (
                  <div>
                    <p className="text-xs text-muted">UPI ID</p>
                    <p className="break-all font-bold">{settings.upiId}</p>
                  </div>
                )}
                {qr && (
                  <a href={qr} target="_blank" rel="noopener" className="mx-auto block w-40 rounded-xl border border-sand bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt="UPI QR" className="aspect-square w-full object-contain" />
                  </a>
                )}
              </div>
            </section>

            <section className="card p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold">{t("pc.newTitle")}</h2>
              <ContributionForm min={settings.contributionMin} />
            </section>
          </div>

          <section className="card mt-6 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold">{t("pc.historyTitle")}</h2>
              {total > 0 && (
                <p className="text-sm text-muted">
                  {t("pc.total")}: <span className="text-base font-extrabold text-leaf">{rupees(total)}</span>
                </p>
              )}
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-muted">{t("pc.none")}</p>
            ) : (
              <>
                {/* Phone: one card per contribution */}
                <ul className="space-y-3 md:hidden">
                  {items.map((c, i) => {
                    const id = String(c._id);
                    const status = c.status as ContributionStatus;
                    return (
                      <li key={id} className="flex gap-3 rounded-xl border border-sand p-3">
                        <SlipThumb id={id} isPdf={c.slip?.mime === PDF_MIME} label={t("pc.viewSlip")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-lg font-extrabold">
                              <span className="mr-1 text-sm font-semibold text-muted">#{items.length - i}</span>
                              {rupees(c.amount)}
                            </p>
                            <ContributionBadge status={status} label={t(`pc.st.${status}`)} />
                          </div>
                          <p className="text-sm text-muted">{formatDateTime(c.createdAt, lang)}</p>
                          {c.officeNote && status === "rejected" && <p className="mt-1 text-sm text-danger">{c.officeNote}</p>}
                          {status === "approved" && c.receiptNo && (
                            <Link href={`/contributions/${id}/receipt`} className="btn btn-ghost btn-sm mt-2">
                              ⬇ {t("pc.download")} · {c.receiptNo}
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Larger screens: table like the reference */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-ink/80 text-muted">
                        <th className="py-2 pr-3 font-semibold">#</th>
                        <th className="py-2 pr-3 font-semibold">{t("pc.colAmount")}</th>
                        <th className="py-2 pr-3 font-semibold">{t("pc.colStatus")}</th>
                        <th className="py-2 pr-3 font-semibold">{t("pc.colSlip")}</th>
                        <th className="py-2 pr-3 font-semibold">{t("pc.colDate")}</th>
                        <th className="py-2 font-semibold">{t("pc.colReceipt")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c, i) => {
                        const id = String(c._id);
                        const status = c.status as ContributionStatus;
                        return (
                          <tr key={id} className="border-b border-sand align-middle">
                            <td className="py-3 pr-3 text-muted">{items.length - i}</td>
                            <td className="py-3 pr-3 text-base font-extrabold">{rupees(c.amount)}</td>
                            <td className="py-3 pr-3">
                              <ContributionBadge status={status} label={t(`pc.st.${status}`)} />
                              {c.officeNote && status === "rejected" && <p className="mt-1 max-w-48 text-xs text-danger">{c.officeNote}</p>}
                            </td>
                            <td className="py-3 pr-3">
                              <SlipThumb id={id} isPdf={c.slip?.mime === PDF_MIME} label={t("pc.viewSlip")} />
                            </td>
                            <td className="py-3 pr-3 whitespace-nowrap">{formatDateTime(c.createdAt, lang)}</td>
                            <td className="py-3">
                              {status === "approved" && c.receiptNo ? (
                                <Link href={`/contributions/${id}/receipt`} className="btn btn-ghost btn-sm whitespace-nowrap">
                                  ⬇ {t("pc.download")}
                                </Link>
                              ) : (
                                <span className="text-muted">NA</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
