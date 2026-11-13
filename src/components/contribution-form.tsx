"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitContribution } from "@/app/actions/contributions";
import { compressImage } from "@/lib/compress";
import { useT } from "./lang";

const MAX_PDF = 4 * 1024 * 1024;
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

function digitsOnly(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const v = el.value.replace(/\D/g, "").slice(0, 9);
  if (v !== el.value) el.value = v;
}

export function ContributionForm({ min }: { min: number }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(submitContribution, undefined);
  const [slip, setSlip] = useState<File | null>(null);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const preview = useMemo(() => (slip && !isPdf(slip) ? URL.createObjectURL(slip) : undefined), [slip]);

  // After a successful send: empty the form for the next one.
  useEffect(() => {
    if (!state?.done) return;
    formRef.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the picked file once the server confirms
    setSlip(null);
  }, [state?.done]);

  const minText = min.toLocaleString("en-IN");
  const err = (k: string) => {
    if (k === "slip" && slipError) return t(slipError);
    const e = state?.errors?.[k];
    return e ? t(e, { min: minText }) : undefined;
  };

  async function pick(f: File | undefined) {
    setSlipError(null);
    if (!f) return;
    if (isPdf(f)) {
      if (f.size > MAX_PDF) return setSlipError("err.pdfTooBig");
      return setSlip(f);
    }
    if (!f.type.startsWith("image/")) return setSlipError("v.slipType");
    setBusy(true);
    setSlip(await compressImage(f));
    setBusy(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (slip) fd.set("slip", slip);
    startTransition(() => action(fd));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      {state?.error && (
        <p className="alert alert-error" role="alert">
          {t(state.error)}
        </p>
      )}
      {state?.ok && <p className="alert alert-ok">{t(state.ok)}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="label">
            {t("pc.amount")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-bold text-muted">₹</span>
            <input
              id="amount"
              name="amount"
              inputMode="numeric"
              pattern="[0-9]*"
              onInput={digitsOnly}
              className="input pl-8 text-lg font-bold"
              placeholder={min > 0 ? minText : ""}
              aria-invalid={err("amount") ? true : undefined}
            />
          </div>
          {err("amount") ? <p className="field-error">{err("amount")}</p> : min > 0 && <p className="hint">{t("pc.amountHint", { min: minText })}</p>}
        </div>
        <div>
          <label htmlFor="ref" className="label">
            {t("pc.ref")}
          </label>
          <input id="ref" name="ref" maxLength={40} autoComplete="off" className="input tracking-wide" aria-invalid={err("ref") ? true : undefined} />
          {err("ref") && <p className="field-error">{err("ref")}</p>}
        </div>
      </div>

      <div>
        <p className="label">{t("pc.slip")}</p>
        <label
          htmlFor="slip"
          className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-3 text-center transition ${
            err("slip") ? "border-danger bg-danger-soft/40" : "border-sand-2 bg-white hover:border-brand hover:bg-brand-soft/40"
          }`}
        >
          {slip && preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-56 w-auto rounded-lg object-contain" />
          ) : slip ? (
            <span className="flex flex-col items-center gap-1">
              <span className="rounded-lg bg-danger px-2.5 py-1 text-sm font-extrabold text-white">PDF</span>
              <span className="max-w-full break-all text-sm font-semibold text-ink">{slip.name}</span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-muted">
              <span className="rounded-full bg-brand-soft p-2.5 text-brand">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3-3 3 3" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-ink">{t("pc.pickSlip")}</span>
            </span>
          )}
          {slip && <span className="rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-white">{t("img.change")}</span>}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-semibold text-brand-dark">{t("img.processing")}</span>}
        </label>
        <input
          id="slip"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            await pick(f);
          }}
        />
        {err("slip") ? <p className="field-error">{err("slip")}</p> : <p className="hint">{t("pc.slipHint")}</p>}
      </div>

      <button className="btn btn-primary w-full sm:w-auto sm:min-w-56" disabled={pending || busy}>
        {pending ? t("pc.sending") : t("pc.submit")}
      </button>
    </form>
  );
}
