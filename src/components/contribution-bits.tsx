import type { ContributionStatus } from "@/lib/models";
import { DATE_LOCALE, type Lang } from "@/lib/i18n";

const STYLE: Record<ContributionStatus, string> = {
  pending: "bg-gold-soft text-[#7a5310]",
  approved: "bg-leaf-soft text-leaf",
  rejected: "bg-danger-soft text-danger",
};

export function ContributionBadge({ status, label }: { status: ContributionStatus; label: string }) {
  return (
    <span className={`chip max-w-full whitespace-normal ${STYLE[status]}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Thumbnail for a bank slip: the photo itself, or a PDF tag. Opens the file in a new tab. */
export function SlipThumb({ id, isPdf, label }: { id: string; isPdf: boolean; label: string }) {
  const href = `/api/contributions/${id}/slip`;
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-block shrink-0" title={label} aria-label={label}>
      {isPdf ? (
        <span className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-sand bg-white text-[0.7rem] font-extrabold text-danger">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
          </svg>
          PDF
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={href} alt="" loading="lazy" className="h-14 w-14 rounded-lg border border-sand bg-white object-cover" />
      )}
    </a>
  );
}

export function formatDateTime(d: Date | string | undefined | null, lang: Lang) {
  if (!d) return "—";
  return new Date(d).toLocaleString(DATE_LOCALE[lang], { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
