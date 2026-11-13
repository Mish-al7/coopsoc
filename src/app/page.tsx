import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { getCurrentUser } from "@/lib/session";
import { getT } from "@/lib/i18n-server";
import { SOCIETY } from "@/lib/society";
import { formatRupees, getSettings } from "@/lib/settings";

const STEP_ICONS = [
  // register
  <path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />,
  // form
  <path key="2" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />,
  // approved
  <path key="3" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
];

export default async function Home() {
  const [user, { t }, settings] = await Promise.all([getCurrentUser().catch(() => null), getT(), getSettings().catch(() => null)]);
  const cta = user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register";
  const needs = [
    ...(settings && settings.feeAmount > 0 ? [t("home.needFee", { amount: formatRupees(settings.feeAmount) })] : []),
    ...["home.need1", "home.need2", "home.need3", "home.need5", "home.need4"].map((k) => t(k)),
  ];
  const steps = [1, 2, 3].map((i) => ({ t: t(`home.step${i}t`), d: t(`home.step${i}d`) }));

  return (
    <>
      {/* Hero — the society site's orange/red banner, modernised */}
      <section className="bg-flame relative overflow-hidden text-white">
        <svg className="pointer-events-none absolute -right-40 -top-32 h-[34rem] w-[34rem] opacity-[0.14]" viewBox="0 0 200 200" aria-hidden="true">
          <path fill="#fff" d="M45.3-58.6C57.5-47.6 65.4-31.9 69.4-14.9 73.3 2.1 73.3 20.5 64.8 33.6 56.4 46.7 39.4 54.6 22.4 60.3 5.4 66 -11.6 69.6-27.6 65.2-43.6 60.8-58.6 48.4-66.6 32.3-74.6 16.2-75.6-3.6-69.3-20.2-63-36.8-49.4-50.2-34.6-60.6-19.8-71-3.9-78.4 10.6-76.4 25.1-74.5 33.1-69.6 45.3-58.6Z" transform="translate(100 100)" />
        </svg>
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#f6a03f]/30 blur-2xl" aria-hidden="true" />

        <div className="container-x relative grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <h1 className="text-[2rem] font-extrabold leading-[1.25] sm:text-5xl sm:leading-[1.18]">
              {t("home.h1a")}
              <br />
              <span className="text-[#ffe2b8]">{t("home.h1b")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/90">
              <span className="block font-bold text-white">{t("society.name")}</span>
              {t("home.lead")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={cta} className="btn btn-white text-lg">
                {user ? t("home.ctaMine") : t("home.ctaApply")}
              </Link>
              {!user && (
                <Link href="/login" className="btn btn-outline-white text-lg">
                  {t("auth.loginBtn")}
                </Link>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="card p-6 text-ink">
              <div className="flex items-center gap-3 border-b border-sand pb-4">
                <Emblem className="h-14 w-14 shrink-0" />
                <div className="min-w-0">
                  <p className="font-extrabold leading-tight text-maroon">{t("society.short")}</p>
                  <p className="text-sm text-muted">
                    {t("society.regNo")} {SOCIETY.regNo}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-lg font-bold">{t("home.needsTitle")}</p>
              <ul className="mt-2 space-y-2.5">
                {needs.map((n) => (
                  <li key={n} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-xs font-bold text-leaf">✓</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* wave into the page */}
        <svg className="relative block h-8 w-full text-white sm:h-12" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0 60V30c180 22 360 30 540 18S900 6 1080 8s270 18 360 28v24z" />
        </svg>
      </section>

      {/* Thrissur crafts illustration (public/crafts.svg). Phones crop to the centre: lamp, nettipattam, elephant. */}
      <section className="bg-white pt-2">
        <div className="container-x">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crafts.svg"
            alt={t("home.craftsAlt")}
            width={1200}
            height={420}
            className="h-56 w-full rounded-3xl object-cover shadow-[0_18px_40px_-24px_rgb(14_49_76/0.35)] ring-1 ring-sand sm:h-auto"
          />
        </div>
      </section>

      {/* How to apply — centred title + divider + icon bubbles, as on thwics.com */}
      <section className="bg-white pb-14 pt-8 sm:pb-20">
        <div className="container-x">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold sm:text-4xl">{t("home.howTitle")}</h2>
            <span className="divider divider-center mt-4" aria-hidden="true" />
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={i} className="group relative rounded-2xl border border-sand bg-white p-6 text-center transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgb(14_49_76/0.35)]">
                <span className="absolute right-4 top-3 text-3xl font-extrabold text-sand-2">0{i + 1}</span>
                <span className="icon-bubble mx-auto">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {STEP_ICONS[i]}
                  </svg>
                </span>
                <p className="mt-4 text-xl font-bold">{s.t}</p>
                <p className="mt-1.5 text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Help */}
      <section className="container-x mt-10 sm:mt-14">
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-extrabold">{t("home.help")}</p>
            <p className="text-muted">{t("society.address")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {SOCIETY.phones.map((p) => (
              <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="btn btn-ghost">
                📞 {p}
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
