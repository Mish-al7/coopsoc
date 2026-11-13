import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm, type ApplicationDefaults } from "@/components/application-form";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fileUrl } from "@/lib/files";
import { Application } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n-server";
import { formatRupees, getSettings, qrUrl, upiLink } from "@/lib/settings";
import type { PaymentInfo } from "@/components/payment-box";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("form.title") };
}

export default async function ApplyPage() {
  const user = await requireUser();
  const { t } = await getT();
  if (user.role === "admin") redirect("/admin");
  await connectDB();
  const app = await Application.findOne({ user: user.id }).lean();
  if (app && !["submitted", "needs_changes"].includes(app.status)) redirect("/dashboard");

  const s = await getSettings();
  const payment: PaymentInfo | null =
    s.feeAmount > 0
      ? {
          amount: formatRupees(s.feeAmount),
          qrUrl: qrUrl(s),
          upiId: s.upiId,
          payeeName: s.payeeName,
          bankDetails: s.bankDetails,
          upiHref: upiLink(s, "THWICS membership fee"),
        }
      : null;
  const paidBefore = app?.payment?.amount;
  const feeChanged = payment && app?.files?.payment && paidBefore != null && paidBefore !== s.feeAmount;

  const id = app ? String(app._id) : "";
  const defaults: ApplicationDefaults = app
    ? {
        isEdit: true,
        values: {
          name: app.name ?? "",
          guardianRelation: app.guardianRelation ?? "",
          guardianName: app.guardianName ?? "",
          age: String(app.age ?? ""),
          occupation: app.occupation ?? "",
          phone: app.phone ?? "",
          aadhaar: decrypt(app.aadhaarEnc),
          address: app.address ?? "",
          desam: app.desam ?? "",
          village: app.village ?? "",
          taluk: app.taluk ?? "",
          nomineeName: app.nominee?.name ?? "",
          nomineeRelation: app.nominee?.relation ?? "",
          nomineeAge: String(app.nominee?.age ?? ""),
          nomineePhone: app.nominee?.phone ?? "",
          nomineeAadhaar: decrypt(app.nominee?.aadhaarEnc),
          nomineeAddress: app.nominee?.address ?? "",
          shares: String(app.shares ?? 1),
          paymentRef: app.payment?.ref ?? "",
        },
        files: {
          payment: fileUrl(id, "payment", app.files?.payment),
          photo: fileUrl(id, "photo", app.files?.photo),
          signature: fileUrl(id, "signature", app.files?.signature),
          aadhaarFront: fileUrl(id, "aadhaarFront", app.files?.aadhaarFront),
          aadhaarBack: fileUrl(id, "aadhaarBack", app.files?.aadhaarBack),
          extra: (app.files?.extra ?? []).map((f, i) => fileUrl(id, `extra-${i}`, f)!),
        },
      }
    : { isEdit: false, values: { name: user.name }, files: { extra: [] } };

  return (
    <div className="container-x max-w-4xl py-6 sm:py-10">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-brand-dark">
          {t("nav.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t("form.title")}</h1>
        <p className="text-muted">{t("form.subtitle")}</p>
        {app?.status === "needs_changes" && app.officeNote && (
          <div className="alert alert-warn mt-4">
            <p className="font-semibold">{t("form.officeNote")}</p>
            <p className="whitespace-pre-line">{app.officeNote}</p>
          </div>
        )}
      </div>
      <ApplicationForm
        defaults={defaults}
        payment={payment}
        paymentNote={feeChanged ? t("pay.newFee", { old: formatRupees(paidBefore!), amount: formatRupees(s.feeAmount) }) : undefined}
      />
    </div>
  );
}
