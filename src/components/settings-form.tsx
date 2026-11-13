"use client";

import { startTransition, useActionState, useState } from "react";
import { saveSettings } from "@/app/actions/settings";
import { ImagePicker } from "./image-picker";
import { useT } from "./lang";

export type SettingsDefaults = {
  feeAmount: string;
  upiId: string;
  payeeName: string;
  bankDetails: string;
  qrUrl?: string;
};

export function SettingsForm({ defaults }: { defaults: SettingsDefaults }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [qr, setQr] = useState<File | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const err = (k: string) => (state?.errors?.[k] ? t(state.errors[k]) : undefined);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (qr) fd.set("qr", qr);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {state?.error && (
        <p className="alert alert-error" role="alert">
          {t(state.error)}
        </p>
      )}
      {state?.ok && <p className="alert alert-ok">{t(state.ok)}</p>}

      <div>
        <label htmlFor="feeAmount" className="label">
          {t("set.fee")}
        </label>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-bold text-muted">₹</span>
          <input
            id="feeAmount"
            name="feeAmount"
            defaultValue={defaults.feeAmount}
            inputMode="numeric"
            pattern="[0-9]*"
            onInput={(e) => {
              const el = e.currentTarget;
              const v = el.value.replace(/\D/g, "").slice(0, 6);
              if (v !== el.value) el.value = v;
            }}
            className="input pl-8 text-lg font-bold"
            aria-invalid={err("feeAmount") ? true : undefined}
          />
        </div>
        {err("feeAmount") ? <p className="field-error">{err("feeAmount")}</p> : <p className="hint">{t("set.feeHint")}</p>}
      </div>

      <div className="max-w-xs">
        <ImagePicker
          id="qr"
          label={t("set.qr")}
          shape="portrait"
          hint={t("set.qrHint")}
          file={qr}
          existingUrl={removeQr ? undefined : defaults.qrUrl}
          onChange={(f) => {
            setQr(f);
            setRemoveQr(false);
          }}
          error={err("qr")}
        />
        {defaults.qrUrl && !qr && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="removeQr" checked={removeQr} onChange={(e) => setRemoveQr(e.target.checked)} className="h-5 w-5 accent-[var(--color-danger)]" />
            {t("set.qrRemove")}
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="upiId" className="label">
            {t("set.upiId")}
          </label>
          <input id="upiId" name="upiId" defaultValue={defaults.upiId} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="input" placeholder="name@bank" aria-invalid={err("upiId") ? true : undefined} />
          {err("upiId") ? <p className="field-error">{err("upiId")}</p> : <p className="hint">{t("set.upiIdHint")}</p>}
        </div>
        <div>
          <label htmlFor="payeeName" className="label">
            {t("set.payee")}
          </label>
          <input id="payeeName" name="payeeName" defaultValue={defaults.payeeName} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="bankDetails" className="label">
          {t("set.bank")}
        </label>
        <textarea id="bankDetails" name="bankDetails" defaultValue={defaults.bankDetails} rows={3} className="input" placeholder={t("set.bankPh")} />
      </div>

      <button className="btn btn-primary w-full sm:w-auto sm:min-w-56" disabled={pending}>
        {pending ? t("set.saving") : t("set.save")}
      </button>
    </form>
  );
}
