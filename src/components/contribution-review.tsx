"use client";

import { useActionState, useMemo } from "react";
import { reviewContribution } from "@/app/actions/contributions";
import { useT } from "./lang";

/** Approve / reject buttons + note for one contribution in the office list. */
export function ContributionReview({ id, note }: { id: string; note?: string }) {
  const { t } = useT();
  const bound = useMemo(() => reviewContribution.bind(null, id), [id]);
  const [state, action, pending] = useActionState(bound, undefined);

  return (
    <form action={action} className="space-y-2">
      <textarea name="officeNote" defaultValue={note} rows={2} className="input min-h-0 text-sm" placeholder={t("pc.notePh")} />
      {state?.error && <p className="alert alert-error text-sm">{t(state.error, state.vars)}</p>}
      {state?.ok && <p className="alert alert-ok text-sm">{t(state.ok, state.vars)}</p>}
      {/* The clicked button's name/value is sent with the form, so one form serves both decisions. */}
      <div className="grid grid-cols-2 gap-2">
        <button name="decision" value="approved" className="btn btn-leaf btn-sm" disabled={pending}>
          ✓ {t("pc.approve")}
        </button>
        <button name="decision" value="rejected" className="btn btn-ghost btn-sm text-danger" disabled={pending}>
          ✕ {t("pc.reject")}
        </button>
      </div>
    </form>
  );
}
