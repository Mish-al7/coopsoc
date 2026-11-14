"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteUpdate, postUpdate } from "@/app/actions/updates";
import { compressImage } from "@/lib/compress";
import { useT } from "./lang";

/** Office form: title, optional text, optional photo. */
export function UpdateForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState(postUpdate, undefined);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : undefined), [photo]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // After a successful post: empty the form for the next one.
  useEffect(() => {
    if (!state?.done) return;
    formRef.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the picked photo once the server confirms
    setPhoto(null);
  }, [state?.done]);

  const err = (k: string) => (k === "photo" && photoError ? t(photoError) : state?.errors?.[k] ? t(state.errors[k]) : undefined);

  async function pick(f: File | undefined) {
    setPhotoError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setPhotoError("v.updPhoto");
    setBusy(true);
    setPhoto(await compressImage(f));
    setBusy(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (photo) fd.set("photo", photo);
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

      <div>
        <label htmlFor="upd-title" className="label">
          {t("upd.fTitle")}
        </label>
        <input id="upd-title" name="title" maxLength={120} className="input" aria-invalid={err("title") ? true : undefined} />
        {err("title") && <p className="field-error">{err("title")}</p>}
      </div>

      <div>
        <label htmlFor="upd-body" className="label">
          {t("upd.fBody")}
        </label>
        <textarea id="upd-body" name="body" rows={5} maxLength={3000} className="input min-h-32 resize-y" />
      </div>

      <div>
        <p className="label">{t("upd.fPhoto")}</p>
        <label
          htmlFor="upd-photo"
          className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-3 text-center transition ${
            err("photo") ? "border-danger bg-danger-soft/40" : "border-sand-2 bg-white hover:border-brand hover:bg-brand-soft/40"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-56 w-auto rounded-lg object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-muted">
              <span className="rounded-full bg-brand-soft p-2.5 text-brand">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-ink">{t("upd.pickPhoto")}</span>
            </span>
          )}
          {photo && <span className="rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-white">{t("img.change")}</span>}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-semibold text-brand-dark">{t("img.processing")}</span>}
        </label>
        <input
          id="upd-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            await pick(f);
          }}
        />
        {err("photo") && <p className="field-error">{err("photo")}</p>}
        {photo && (
          <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-sm font-semibold text-muted hover:text-danger">
            ✕ {t("upd.removePhoto")}
          </button>
        )}
      </div>

      <button className="btn btn-primary w-full sm:w-auto sm:min-w-56" disabled={pending || busy}>
        {pending ? t("upd.posting") : t("upd.post")}
      </button>
    </form>
  );
}

/** Asks before deleting; the update and its photo are removed for good. */
export function DeleteUpdateButton({ id }: { id: string }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("upd.deleteConfirm"))) return;
        start(() => deleteUpdate(id));
      }}
      className="btn btn-ghost btn-sm text-danger disabled:opacity-50"
    >
      🗑 {t("upd.delete")}
    </button>
  );
}
