"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { useT } from "./lang";

export type NavIcon = "user" | "bell" | "rupee" | "list" | "gear";
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number };

const ICONS: Record<NavIcon, React.ReactNode> = {
  user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  rupee: <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }: { name: NavIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/** `/admin` matches only itself and application pages; other links also match their sub-pages. */
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/applications");
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Hamburger button + side drawer for logged-in users. Built on <dialog> so focus is trapped
 * while it's open and Esc closes it. Room for more pages as the app grows.
 */
export function NavDrawer({ items, name, email }: { items: NavItem[]; name: string; email: string }) {
  const { t } = useT();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  // The header lives in the root layout, which doesn't re-render on client navigation,
  // so once the member has opened /updates we hide its badge here ourselves.
  const [seenUpdates, setSeenUpdates] = useState(false);

  useEffect(() => {
    ref.current?.close();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to navigation
    if (pathname.startsWith("/updates")) setSeenUpdates(true);
  }, [pathname]);

  const shown = items.map((i) => ({ ...i, badge: i.href === "/updates" && seenUpdates ? 0 : i.badge }));
  const anyBadge = shown.some((i) => i.badge && !isActive(pathname, i.href));

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="btn btn-ghost btn-sm relative h-10 w-10 shrink-0 px-0"
        aria-label={t("nav.menu")}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {anyBadge && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand" aria-hidden="true" />}
      </button>

      <dialog
        ref={ref}
        className="drawer"
        aria-label={t("nav.menu")}
        // A click on the dim backdrop lands on the <dialog> itself.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="flex h-full flex-col">
          <div className="bg-flame flex items-start justify-between gap-3 px-5 pb-5 pt-6 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold leading-tight">{name}</p>
              <p className="truncate text-sm text-white/85">{email}</p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              aria-label={t("nav.close")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {shown.map((i) => {
                const active = isActive(pathname, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => ref.current?.close()}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 font-semibold transition ${
                        active ? "bg-brand-soft text-brand-dark" : "text-ink hover:bg-cream"
                      }`}
                    >
                      <Icon name={i.icon} className={`h-5 w-5 shrink-0 ${active ? "text-brand" : "text-muted"}`} />
                      <span className="min-w-0 flex-1">{i.label}</span>
                      {!!i.badge && !active && (
                        <span className="min-w-6 rounded-full bg-brand px-2 py-0.5 text-center text-xs font-bold text-white">{i.badge > 99 ? "99+" : i.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <form action={logout} className="border-t border-sand p-3">
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 font-semibold text-muted transition hover:bg-cream hover:text-brand-dark">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              {t("nav.logout")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
