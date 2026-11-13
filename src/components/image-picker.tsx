"use client";

import { useMemo, useState } from "react";
import { compressImage } from "@/lib/compress";
import { useT } from "./lang";

// Preview URLs aren't revoked: a page holds at most ~7 small images, and
// revoking inside effects breaks previews under React StrictMode.
function useObjectUrl(file: File | null | undefined) {
  return useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

type Props = {
  id: string;
  label: string;
  hint?: string;
  existingUrl?: string;
  file: File | null;
  onChange: (f: File) => void;
  error?: string;
  shape?: "portrait" | "wide";
};

export function ImagePicker({ id, label, hint, existingUrl, file, onChange, error, shape = "wide" }: Props) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const local = useObjectUrl(file);
  const preview = local ?? existingUrl;

  return (
    <div data-error={error ? "true" : undefined} id={`field-${id}`}>
      <p className="label">{label}</p>
      <label
        htmlFor={id}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition ${
          shape === "portrait" ? "aspect-[4/5]" : "aspect-[4/3] sm:aspect-[16/10]"
        } ${error ? "border-danger bg-danger-soft/40" : preview ? "border-sand-2 bg-paper" : "border-sand-2 bg-white hover:border-brand hover:bg-brand-soft/40"}`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="h-full w-full object-contain" />
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-white">{t("img.change")}</span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-muted sm:gap-1.5">
            <span className="rounded-full bg-brand-soft p-2 text-brand sm:p-2.5">
              <CameraIcon />
            </span>
            <span className="text-xs font-semibold leading-snug text-ink sm:text-sm">{t("img.pick")}</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-semibold text-brand-dark">{t("img.processing")}</span>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          onChange(await compressImage(f));
          setBusy(false);
        }}
      />
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Thumb({ src, file, onRemove }: { src?: string; file?: File; onRemove: () => void }) {
  const { t } = useT();
  const local = useObjectUrl(file);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-paper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={local ?? src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/75 text-lg text-white"
        aria-label={t("img.remove")}
      >
        ×
      </button>
    </div>
  );
}

export function ExtraPhotos({
  existing,
  keep,
  setKeep,
  added,
  setAdded,
  max,
  error,
}: {
  existing: string[];
  keep: number[];
  setKeep: (k: number[]) => void;
  added: File[];
  setAdded: (f: File[]) => void;
  max: number;
  error?: string;
}) {
  const { t } = useT();
  const total = keep.length + added.length;
  return (
    <div data-error={error ? "true" : undefined} id="field-extra">
      <p className="label">{t("f.extra", { max })}</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {keep.map((i) => (
          <Thumb key={`e${i}`} src={existing[i]} onRemove={() => setKeep(keep.filter((k) => k !== i))} />
        ))}
        {added.map((f, i) => (
          <Thumb key={`n${i}-${f.name}`} file={f} onRemove={() => setAdded(added.filter((_, j) => j !== i))} />
        ))}
        {total < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-sand-2 bg-white text-muted hover:border-brand hover:text-brand-dark">
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs font-semibold">{t("img.add")}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const picked = Array.from(e.target.files ?? []).slice(0, max - total);
                e.target.value = "";
                const done = await Promise.all(picked.map((f) => compressImage(f)));
                setAdded([...added, ...done]);
              }}
            />
          </label>
        )}
      </div>
      {error ? <p className="field-error">{error}</p> : <p className="hint">{t("f.extraHint")}</p>}
    </div>
  );
}
