"use client";

import { useState } from "react";
import { useT } from "./lang";

export type PaymentInfo = {
  amount: string; // already formatted, e.g. "₹500"
  qrUrl?: string;
  upiId: string;
  payeeName: string;
  bankDetails: string;
  upiHref?: string;
};

/** How to pay: amount, QR, UPI ID and bank details. Used in the form and in the settings preview. */
export function PaymentBox({ info }: { info: PaymentInfo }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(info.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the ID is still visible to copy by hand */
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white">
      <div className="bg-flame flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-5">
        <span className="text-sm font-semibold text-white/90">{t("pay.amount")}</span>
        <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{info.amount}</span>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-[13rem_1fr] sm:p-5">
        {info.qrUrl && (
          <div className="mx-auto w-full max-w-[13rem]">
            <a href={info.qrUrl} target="_blank" rel="noopener" className="block rounded-xl border border-sand bg-white p-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.qrUrl} alt="UPI QR" className="aspect-square w-full object-contain" />
            </a>
            <a href={info.qrUrl} download="thwics-payment-qr.jpg" className="btn btn-ghost btn-sm mt-2 w-full">
              ⬇ {t("pay.saveQr")}
            </a>
          </div>
        )}

        <div className="min-w-0 space-y-3">
          <ol className="space-y-2 text-sm">
            {[t("pay.step1", { amount: info.amount }), t("pay.step2"), t("pay.step3")].map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-dark">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>

          {info.upiHref && (
            <a href={info.upiHref} className="btn btn-primary w-full sm:hidden">
              {t("pay.openApp")} · {info.amount}
            </a>
          )}

          {(info.upiId || info.payeeName) && (
            <dl className="space-y-2 rounded-xl bg-cream p-3 text-sm">
              {info.upiId && (
                <div>
                  <dt className="text-xs text-muted">UPI ID</dt>
                  <dd className="flex items-center gap-2">
                    <span className="min-w-0 break-all font-bold">{info.upiId}</span>
                    <button type="button" onClick={copy} className="btn btn-ghost btn-sm min-h-0 shrink-0 px-2.5 py-1 text-xs">
                      {copied ? t("pay.copied") : t("pay.copy")}
                    </button>
                  </dd>
                </div>
              )}
              {info.payeeName && (
                <div>
                  <dt className="text-xs text-muted">{t("set.payee")}</dt>
                  <dd className="font-semibold">{info.payeeName}</dd>
                </div>
              )}
            </dl>
          )}

          {info.bankDetails && (
            <div className="text-sm">
              <p className="text-xs text-muted">{t("pay.bank")}</p>
              <p className="whitespace-pre-line font-semibold">{info.bankDetails}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
