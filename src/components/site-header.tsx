import Link from "next/link";
import { Emblem } from "./emblem";
import { LangSwitch } from "./lang";
import { NavDrawer, type NavItem } from "./nav-drawer";
import { SOCIETY } from "@/lib/society";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { getT } from "@/lib/i18n-server";
import type { TFn } from "@/lib/i18n";
import { connectDB } from "@/lib/db";
import { Application, Contribution, Update } from "@/lib/models";

/** Pages in the side menu. Add new features here. */
async function menuItems(user: CurrentUser, t: TFn): Promise<NavItem[]> {
  await connectDB();
  if (user.role === "admin") {
    const pending = await Contribution.countDocuments({ status: "pending" });
    return [
      { href: "/admin", label: t("admin.title"), icon: "list" },
      { href: "/admin/contributions", label: t("admin.contributions"), icon: "rupee", badge: pending },
      { href: "/admin/updates", label: t("nav.updates"), icon: "bell" },
      ...(user.superAdmin ? [{ href: "/admin/settings", label: t("nav.settings"), icon: "gear" } as const] : []),
    ];
  }
  const [app, unread] = await Promise.all([
    Application.findOne({ user: user.id }, { status: 1 }).lean(),
    Update.countDocuments(user.updatesSeenAt ? { createdAt: { $gt: user.updatesSeenAt } } : {}),
  ]);
  return [
    { href: "/dashboard", label: t("nav.myApp"), icon: "user" },
    { href: "/updates", label: t("nav.updates"), icon: "bell", badge: unread },
    ...(app?.status === "approved" ? [{ href: "/contributions", label: t("pc.title"), icon: "rupee" } as const] : []),
  ];
}

export async function SiteHeader() {
  const [user, { t }] = await Promise.all([getCurrentUser().catch(() => null), getT()]);
  const items = user ? await menuItems(user, t).catch(() => []) : [];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-sand bg-white/90 backdrop-blur-md">
      <div className="bg-flame h-1" aria-hidden="true" />
      <div className="container-x flex h-16 items-center justify-between gap-2 sm:h-[4.5rem] sm:gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Emblem className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
          <span className="hidden min-w-0 leading-tight min-[480px]:block">
            <span className="block truncate text-[0.95rem] font-extrabold tracking-tight text-maroon sm:text-base">{t("society.short")}</span>
            <span className="block truncate text-xs font-semibold text-maroon/75">
              {t("society.sub")} · {SOCIETY.regNo}
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LangSwitch />
          {user ? (
            <NavDrawer items={items} name={user.name} email={user.email} />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const { t } = await getT();
  return (
    <footer className="no-print bg-flame relative mt-16 overflow-hidden text-white">
      {/* soft blobs, like the banner on the society site */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-black/5" aria-hidden="true" />

      <div className="container-x relative grid gap-8 py-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white p-1 shadow-sm">
              <Emblem className="h-12 w-12" />
            </span>
            <p className="font-display text-base font-extrabold leading-snug">{t("society.name")}</p>
          </div>
          <p className="mt-3 max-w-sm text-white/85">{t("footer.about")}</p>
          <p className="mt-2 text-white/85">
            {t("society.regNo")} {SOCIETY.regNo}
          </p>
        </div>

        <div>
          <p className="font-display text-base font-bold">{t("footer.headOffice")}</p>
          <p className="mt-2 text-white/85">{t("society.address")}</p>
        </div>

        <div>
          <p className="font-display text-base font-bold">{t("footer.contact")}</p>
          <ul className="mt-2 space-y-1.5 text-white/90">
            {SOCIETY.phones.map((p) => (
              <li key={p}>
                <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:underline">
                  📞 {p}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/20">
        <p className="container-x py-4 text-xs text-white/80">
          © {new Date().getFullYear()} THWICS · {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
