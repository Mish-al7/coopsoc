import Link from "next/link";
import type { TFn } from "@/lib/i18n";

export const PAGE_SIZE = 30;

/** Reads `?page=` (1-based) and clamps it to the pages that exist. */
export function pageInfo(raw: string | undefined, total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const n = Number.parseInt(raw ?? "", 10);
  const page = Number.isFinite(n) ? Math.min(Math.max(n, 1), pages) : 1;
  return { page, pages, skip: (page - 1) * PAGE_SIZE };
}

/** Previous / next links for a list page. `href(p)` builds the URL for page p. Hidden when there's one page. */
export function Pager({
  page,
  pages,
  total,
  href,
  t,
}: {
  page: number;
  pages: number;
  total: number;
  href: (p: number) => string;
  t: TFn;
}) {
  if (pages <= 1) return null;
  // Page info on top; the two buttons share a row under it (equal halves on phones, at the edges on wider screens).
  const cls = "btn btn-ghost btn-sm flex-1 whitespace-nowrap sm:flex-none";
  const off = `${cls} pointer-events-none opacity-40`;
  return (
    <nav className="mt-6" aria-label="Pagination">
      <p className="mb-2 text-center text-sm text-muted">
        {t("pager.info", { p: page, pages, n: total })}
      </p>
      <div className="flex gap-2 sm:justify-between">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cls} rel="prev">
            {t("pager.prev")}
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            {t("pager.prev")}
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={cls} rel="next">
            {t("pager.next")}
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            {t("pager.next")}
          </span>
        )}
      </div>
    </nav>
  );
}
