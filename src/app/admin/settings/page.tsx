import type { Metadata } from "next";
import Link from "next/link";
import { PaymentBox } from "@/components/payment-box";
import { SettingsForm } from "@/components/settings-form";
import { DATE_LOCALE } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { connectDB } from "@/lib/db";
import { Settings } from "@/lib/models";
import { requireSuperAdmin } from "@/lib/session";
import { formatRupees, getSettings, qrUrl, upiLink } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("set.title") };
}

export default async function SettingsPage() {
  await requireSuperAdmin();
  const [{ t, lang }, s] = await Promise.all([getT(), getSettings()]);
  await connectDB();
  const meta = await Settings.findById("main", { updatedAt: 1 }).lean();

  return (
    <div className="container-x max-w-5xl py-6 sm:py-10">
      <Link href="/admin" className="text-sm font-semibold text-muted hover:text-brand-dark">
        {t("admin.back")}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t("set.title")}</h1>
      <p className="text-muted">{t("set.sub")}</p>
      <span className="divider mt-3" aria-hidden="true" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section className="card p-4 sm:p-6">
          <SettingsForm
            defaults={{
              feeAmount: String(s.feeAmount),
              upiId: s.upiId,
              payeeName: s.payeeName,
              bankDetails: s.bankDetails,
              qrUrl: qrUrl(s),
            }}
          />
          {meta?.updatedAt && (
            <p className="mt-4 text-xs text-muted">
              {t("set.lastChanged")}:{" "}
              {new Date(meta.updatedAt).toLocaleString(DATE_LOCALE[lang], { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="label">{t("set.preview")}</p>
          {s.feeAmount > 0 ? (
            <PaymentBox
              info={{
                amount: formatRupees(s.feeAmount),
                qrUrl: qrUrl(s),
                upiId: s.upiId,
                payeeName: s.payeeName,
                bankDetails: s.bankDetails,
                upiHref: upiLink(s, "THWICS membership fee"),
              }}
            />
          ) : (
            <p className="alert alert-warn">{t("set.off")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
