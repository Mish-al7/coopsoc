"use client";

import { useActionState, useMemo, useState } from "react";
import { reviewApplication } from "@/app/actions/admin";
import { STATUSES, type Status } from "@/lib/society";
import { useT } from "./lang";

export function ReviewForm({
  id,
  initial,
}: {
  id: string;
  initial: { status: Status; aadhaarVerified: boolean; officeNote: string; membershipNo: string; hasPayment: boolean; paymentVerified: boolean };
}) {
  const { t } = useT();
  const bound = useMemo(() => reviewApplication.bind(null, id), [id]);
  const [state, action, pending] = useActionState(bound, undefined);
  const [status, setStatus] = useState<Status>(initial.status);
  const [verified, setVerified] = useState(initial.aadhaarVerified);
  const [paid, setPaid] = useState(initial.paymentVerified);

  return (
    <form action={action} className="space-y-4">
      {initial.hasPayment && (
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${paid ? "border-leaf bg-leaf-soft" : "border-sand-2 bg-white"}`}>
          <input type="checkbox" name="paymentVerified" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-leaf)]" />
          <span>
            <span className="block font-semibold">{t("rev.paymentVerified")}</span>
            <span className="block text-xs text-muted">{t("rev.paymentVerifiedHint")}</span>
          </span>
        </label>
      )}

      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${verified ? "border-leaf bg-leaf-soft" : "border-sand-2 bg-white"}`}>
        <input type="checkbox" name="aadhaarVerified" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-leaf)]" />
        <span>
          <span className="block font-semibold">{t("rev.verified")}</span>
          <span className="block text-xs text-muted">{t("rev.verifiedHint")}</span>
        </span>
      </label>

      <fieldset>
        <legend className="label">{t("rev.decision")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <label
              key={s}
              className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-2 py-2 text-center text-sm font-semibold leading-snug transition ${status === s ? "border-brand bg-brand-soft text-brand-dark" : "border-sand-2 bg-paper text-ink"}`}
            >
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
              {t(`status.${s}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {status === "approved" ? (
        <div>
          <label htmlFor="membershipNo" className="label">
            {t("rev.memberNo")} <span className="en">{t("rev.memberNoHint")}</span>
          </label>
          <input id="membershipNo" name="membershipNo" defaultValue={initial.membershipNo} className="input" placeholder={t("rev.memberNoPh")} />
        </div>
      ) : (
        <input type="hidden" name="membershipNo" value={initial.membershipNo} />
      )}

      <div>
        <label htmlFor="officeNote" className="label">
          {t("rev.note")} <span className="en">{status === "needs_changes" ? t("rev.noteForMember") : t("rev.noteOptional")}</span>
        </label>
        <textarea id="officeNote" name="officeNote" defaultValue={initial.officeNote} rows={3} className="input" placeholder={status === "needs_changes" ? t("rev.notePh") : ""} />
      </div>

      {state?.error && <p className="alert alert-error">{t(state.error, state.vars)}</p>}
      {state?.ok && <p className="alert alert-ok">{t(state.ok, state.vars)}</p>}

      <button className="btn btn-leaf w-full" disabled={pending}>
        {pending ? t("rev.saving") : t("rev.save")}
      </button>
    </form>
  );
}
