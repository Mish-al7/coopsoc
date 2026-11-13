"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { submitApplication } from "@/app/actions/application";
import { cleanAadhaar, formatAadhaar, isValidAadhaar } from "@/lib/aadhaar";
import { NOMINEE_RELATIONS, TALUKS } from "@/lib/i18n";
import { GUARDIAN_RELATIONS } from "@/lib/society";
import { applicationSchema, fieldErrors, FILE_SLOTS, formText, MAX_EXTRA, type FileSlot } from "@/lib/validation";
import { ExtraPhotos, ImagePicker } from "./image-picker";
import { useT } from "./lang";
import { PaymentBox, type PaymentInfo } from "./payment-box";

export type ApplicationDefaults = {
  isEdit: boolean;
  values: Record<string, string>;
  files: Partial<Record<FileSlot | "payment", string>> & { extra: string[] };
};

const PAYMENT_REF_RE = /^[A-Za-z0-9 /-]{0,40}$/;

function Section({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-sand pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-bold text-brand-dark">{n}</span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
          {sub && <p className="text-xs text-muted sm:text-sm">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  error,
  className = "",
  children,
}: {
  name: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} data-error={error ? "true" : undefined}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function AadhaarInput({ name, defaultValue, invalid }: { name: string; defaultValue?: string; invalid?: boolean }) {
  const { t } = useT();
  const [v, setV] = useState(formatAadhaar(defaultValue ?? ""));
  const digits = cleanAadhaar(v);
  const status = digits.length < 12 ? null : isValidAadhaar(digits);
  return (
    <>
      <div className="relative">
        <input
          id={name}
          name={name}
          value={v}
          onChange={(e) => setV(formatAadhaar(e.target.value.replace(/\D/g, "")))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="XXXX XXXX XXXX"
          maxLength={14}
          className="input pr-11 font-semibold tracking-[0.12em]"
          aria-invalid={invalid || status === false}
        />
        {status !== null && (
          <span
            className={`absolute inset-y-0 right-3 my-auto flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white ${status ? "bg-leaf" : "bg-danger"}`}
            aria-hidden="true"
          >
            {status ? "✓" : "!"}
          </span>
        )}
      </div>
      {!invalid && status === false && <p className="field-error">{t("aadhaar.liveInvalid")}</p>}
    </>
  );
}

export function ApplicationForm({
  defaults,
  payment,
  paymentNote,
}: {
  defaults: ApplicationDefaults;
  /** Fee + how to pay; null when the society has no fee set. */
  payment: PaymentInfo | null;
  paymentNote?: string;
}) {
  const { t, lang } = useT();
  const [state, action, pending] = useActionState(submitApplication, undefined);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Partial<Record<FileSlot | "payment", File>>>({});
  const [keepExtra, setKeepExtra] = useState<number[]>(defaults.files.extra.map((_, i) => i));
  const [addedExtra, setAddedExtra] = useState<File[]>([]);
  const [address, setAddress] = useState(defaults.values.address ?? "");
  const [nomineeAddress, setNomineeAddress] = useState(defaults.values.nomineeAddress ?? "");
  const [sameAddress, setSameAddress] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const rawErrors = { ...(state?.errors ?? {}), ...clientErrors };
  const v = defaults.values;

  // Bring the first problem into view after a failed submit.
  useEffect(() => {
    if (!scrollTick && !state) return;
    const el = formRef.current?.querySelector('[data-error="true"]') ?? document.getElementById("form-alert");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state, scrollTick]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (sameAddress) fd.set("nomineeAddress", address);

    const parsed = applicationSchema.safeParse(formText(fd));
    const ce = parsed.success ? {} : fieldErrors(parsed.error);
    for (const slot of FILE_SLOTS) if (!files[slot] && !defaults.files[slot]) ce[slot] = "v.photoRequired";
    if (payment && !files.payment && !defaults.files.payment) ce.payment = "v.paymentRequired";
    if (!PAYMENT_REF_RE.test(String(fd.get("paymentRef") ?? "").trim())) ce.paymentRef = "v.paymentRef";

    setClientErrors(ce);
    if (Object.keys(ce).length) {
      setScrollTick((n) => n + 1);
      return;
    }

    for (const slot of FILE_SLOTS) if (files[slot]) fd.set(slot, files[slot]!);
    if (files.payment) fd.set("payment", files.payment);
    for (const f of addedExtra) fd.append("extra", f);
    for (const i of keepExtra) fd.append("keepExtra", String(i));
    startTransition(() => action(fd));
  }

  const clear = (k: string) => {
    if (!clientErrors[k]) return;
    setClientErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== k)));
  };
  const setFile = (slot: FileSlot | "payment") => (f: File) => {
    setFiles((p) => ({ ...p, [slot]: f }));
    clear(slot);
  };

  const err = (k: string) => (rawErrors[k] ? t(rawErrors[k], { max: MAX_EXTRA }) : undefined);
  const inv = (k: string) => (rawErrors[k] ? true : undefined);
  const hasErrors = Object.keys(rawErrors).length > 0;
  // The fee comes first, so the other sections shift by one when it is shown.
  const n = (i: number) => (payment ? i + 1 : i);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-5"
      onChange={(e) => clear((e.target as unknown as HTMLInputElement).name)}
    >
      {(state?.error || hasErrors) && (
        <p id="form-alert" className="alert alert-error" role="alert">
          {t(state?.error ?? "form.fixSummary")}
        </p>
      )}

      {payment && (
        <Section n={1} title={t("sec.payment")} sub={t("sec.paymentSub")}>
          {paymentNote && <p className="alert alert-warn mb-4">{paymentNote}</p>}
          <PaymentBox info={payment} />
          <div className="mt-5 grid gap-4 sm:grid-cols-[14rem_1fr] sm:items-start">
            <ImagePicker
              id="payment"
              label={t("pay.screenshot")}
              shape="portrait"
              hint={t("pay.screenshotHint")}
              file={files.payment ?? null}
              existingUrl={defaults.files.payment}
              onChange={setFile("payment")}
              error={err("payment")}
            />
            <Field name="paymentRef" label={t("pay.ref")} error={err("paymentRef")}>
              <input
                id="paymentRef"
                name="paymentRef"
                defaultValue={v.paymentRef}
                autoComplete="off"
                autoCapitalize="characters"
                className="input font-semibold tracking-wide"
                placeholder="412345678901"
                maxLength={40}
                aria-invalid={inv("paymentRef")}
              />
            </Field>
          </div>
        </Section>
      )}

      <Section n={n(1)} title={t("sec.applicant")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label={t("f.name")} error={err("name")} className="sm:col-span-2">
            <input id="name" name="name" defaultValue={v.name} autoComplete="name" className="input" aria-invalid={inv("name")} />
          </Field>

          <Field name="guardianName" label={t("f.guardian")} error={err("guardianRelation") ?? err("guardianName")} className="sm:col-span-2">
            <div className="flex gap-2">
              <select
                name="guardianRelation"
                defaultValue={v.guardianRelation || ""}
                className="input w-[8.5rem] shrink-0"
                aria-label={t("f.relation")}
                aria-invalid={inv("guardianRelation")}
              >
                <option value="" disabled>
                  {t("f.relation")}
                </option>
                {GUARDIAN_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`rel.${r}`)}
                  </option>
                ))}
              </select>
              <input id="guardianName" name="guardianName" defaultValue={v.guardianName} className="input min-w-0" aria-invalid={inv("guardianName")} />
            </div>
          </Field>

          <Field name="age" label={t("f.age")} error={err("age")}>
            <input id="age" name="age" defaultValue={v.age} inputMode="numeric" className="input" aria-invalid={inv("age")} />
          </Field>
          <Field name="occupation" label={t("f.occupation")} error={err("occupation")}>
            <input id="occupation" name="occupation" defaultValue={v.occupation} className="input" placeholder={t("f.occupationPh")} aria-invalid={inv("occupation")} />
          </Field>
          <Field name="phone" label={t("f.phone")} error={err("phone")}>
            <input id="phone" name="phone" type="tel" defaultValue={v.phone} inputMode="tel" autoComplete="tel" className="input" placeholder="98XXXXXXXX" aria-invalid={inv("phone")} />
          </Field>
          <Field name="aadhaar" label={t("f.aadhaar")} error={err("aadhaar")}>
            <AadhaarInput name="aadhaar" defaultValue={v.aadhaar} invalid={inv("aadhaar")} />
          </Field>
        </div>
      </Section>

      <Section n={n(2)} title={t("sec.address")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="address" label={t("f.address")} error={err("address")} className="sm:col-span-3">
            <textarea id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="input" placeholder={t("f.addressPh")} aria-invalid={inv("address")} />
          </Field>
          <Field name="desam" label={t("f.desam")} error={err("desam")}>
            <input id="desam" name="desam" defaultValue={v.desam} className="input" aria-invalid={inv("desam")} />
          </Field>
          <Field name="village" label={t("f.village")} error={err("village")}>
            <input id="village" name="village" defaultValue={v.village} className="input" aria-invalid={inv("village")} />
          </Field>
          <Field name="taluk" label={t("f.taluk")} error={err("taluk")}>
            <input id="taluk" name="taluk" list="taluks" defaultValue={v.taluk} className="input" aria-invalid={inv("taluk")} />
            <datalist id="taluks">
              {TALUKS[lang].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </Field>
        </div>
      </Section>

      <Section n={n(3)} title={t("sec.nominee")} sub={t("sec.nomineeSub")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="nomineeName" label={t("f.nomineeName")} error={err("nomineeName")}>
            <input id="nomineeName" name="nomineeName" defaultValue={v.nomineeName} className="input" aria-invalid={inv("nomineeName")} />
          </Field>
          <Field name="nomineeRelation" label={t("f.nomineeRelation")} error={err("nomineeRelation")}>
            <input id="nomineeRelation" name="nomineeRelation" list="relations" defaultValue={v.nomineeRelation} className="input" aria-invalid={inv("nomineeRelation")} />
            <datalist id="relations">
              {NOMINEE_RELATIONS[lang].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field name="nomineeAge" label={t("f.age")} error={err("nomineeAge")}>
            <input id="nomineeAge" name="nomineeAge" defaultValue={v.nomineeAge} inputMode="numeric" className="input" aria-invalid={inv("nomineeAge")} />
          </Field>
          <Field name="nomineePhone" label={t("f.phone")} error={err("nomineePhone")}>
            <input id="nomineePhone" name="nomineePhone" type="tel" defaultValue={v.nomineePhone} inputMode="tel" className="input" placeholder="98XXXXXXXX" aria-invalid={inv("nomineePhone")} />
          </Field>
          <Field name="nomineeAadhaar" label={t("f.aadhaar")} error={err("nomineeAadhaar")} className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <AadhaarInput name="nomineeAadhaar" defaultValue={v.nomineeAadhaar} invalid={inv("nomineeAadhaar")} />
          </Field>
          <Field name="nomineeAddress" label={t("f.nomineeAddress")} error={err("nomineeAddress")} className="sm:col-span-2">
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
              {t("f.sameAddress")}
            </label>
            <textarea
              id="nomineeAddress"
              name="nomineeAddress"
              rows={3}
              value={sameAddress ? address : nomineeAddress}
              onChange={(e) => setNomineeAddress(e.target.value)}
              readOnly={sameAddress}
              className={`input ${sameAddress ? "bg-cream text-muted" : ""}`}
              aria-invalid={inv("nomineeAddress")}
            />
          </Field>
        </div>
      </Section>

      <Section n={n(4)} title={t("sec.shares")}>
        <Field name="shares" label={t("f.shares")} error={err("shares")} className="max-w-xs">
          <input id="shares" name="shares" defaultValue={v.shares || "1"} inputMode="numeric" className="input" aria-invalid={inv("shares")} />
        </Field>
      </Section>

      <Section n={n(5)} title={t("sec.docs")}>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <ImagePicker id="photo" label={t("f.photo")} shape="portrait" file={files.photo ?? null} existingUrl={defaults.files.photo} onChange={setFile("photo")} error={err("photo")} />
          <ImagePicker id="signature" label={t("f.signature")} shape="portrait" hint={t("f.signatureHint")} file={files.signature ?? null} existingUrl={defaults.files.signature} onChange={setFile("signature")} error={err("signature")} />
          <ImagePicker id="aadhaarFront" label={t("f.aadhaarFront")} file={files.aadhaarFront ?? null} existingUrl={defaults.files.aadhaarFront} onChange={setFile("aadhaarFront")} error={err("aadhaarFront")} />
          <ImagePicker id="aadhaarBack" label={t("f.aadhaarBack")} file={files.aadhaarBack ?? null} existingUrl={defaults.files.aadhaarBack} onChange={setFile("aadhaarBack")} error={err("aadhaarBack")} />
        </div>
        <div className="mt-6">
          <ExtraPhotos existing={defaults.files.extra} keep={keepExtra} setKeep={setKeepExtra} added={addedExtra} setAdded={setAddedExtra} max={MAX_EXTRA} error={err("extra")} />
        </div>
      </Section>

      <section className="card bg-gradient-to-br from-paper to-brand-soft/40 p-4 sm:p-6" data-error={err("declaration") ? "true" : undefined}>
        <p className="font-display text-lg font-semibold">{t("decl.sir")}</p>
        <p className="mt-1 leading-relaxed text-ink/90">{t("decl.text")}</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-paper p-3 ring-1 ring-sand">
          <input type="checkbox" name="declaration" defaultChecked={defaults.isEdit} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-brand)]" />
          <span className="text-sm">{t("decl.agree")}</span>
        </label>
        {err("declaration") && <p className="field-error">{err("declaration")}</p>}
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-sand bg-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button className="btn btn-primary w-full text-lg sm:w-auto sm:min-w-64" disabled={pending}>
          {pending ? t("submit.pending") : defaults.isEdit ? t("submit.edit") : t("submit.new")}
        </button>
      </div>
    </form>
  );
}
