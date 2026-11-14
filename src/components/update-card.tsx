import { formatDateTime } from "./contribution-bits";
import type { Lang, TFn } from "@/lib/i18n";
import type { UpdateDoc } from "@/lib/models";

export const updatePhotoUrl = (id: string) => `/api/updates/${id}/photo`;

type Props = {
  u: Pick<UpdateDoc, "_id" | "title" | "body" | "photo" | "createdAt">;
  t: TFn;
  lang: Lang;
  isNew?: boolean;
  /** Small row for the profile page: thumbnail, title, date and the start of the text. */
  compact?: boolean;
  /** Extra controls under the card (e.g. the office's delete button). */
  footer?: React.ReactNode;
};

export function UpdateCard({ u, t, lang, isNew, compact, footer }: Props) {
  const id = String(u._id);
  const photo = u.photo ? updatePhotoUrl(id) : undefined;
  const badge = isNew && <span className="chip shrink-0 bg-brand text-white">{t("upd.new")}</span>;

  if (compact) {
    return (
      <div className="flex gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl border border-sand bg-sand object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 font-bold leading-snug">{u.title}</p>
            {badge}
          </div>
          <p className="text-xs text-muted">{formatDateTime(u.createdAt, lang)}</p>
          {u.body && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{u.body}</p>}
        </div>
      </div>
    );
  }

  return (
    <article className={`card overflow-hidden ${isNew ? "ring-2 ring-brand/30" : ""}`}>
      {photo && (
        <a href={photo} target="_blank" rel="noopener" className="block bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={u.title} loading="lazy" className="max-h-[28rem] w-full object-cover" />
        </a>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold leading-snug sm:text-xl">{u.title}</h2>
          {badge}
        </div>
        <p className="mt-0.5 text-sm text-muted">{formatDateTime(u.createdAt, lang)}</p>
        {u.body && <p className="mt-3 whitespace-pre-line break-words">{u.body}</p>}
        {footer && <div className="mt-4 border-t border-sand pt-3">{footer}</div>}
      </div>
    </article>
  );
}
