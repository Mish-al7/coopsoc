"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/lang";

// After a new deployment, a page that was already open can call a Server Action
// that no longer exists ("Failed to find Server Action"). A full reload loads the
// new version, so we reload once automatically and otherwise offer a button.
const RELOAD_KEY = "coopsoc:auto-reload-at";
const RELOAD_WINDOW_MS = 30_000;

function reloadOnceAutomatically(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false; // already tried — don't loop
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: just show the page below
  }
  window.location.reload();
  return true;
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useT();

  useEffect(() => {
    console.error(error);
    reloadOnceAutomatically();
  }, [error]);

  return (
    <div className="container-x flex justify-center py-12 sm:py-20">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <span className="icon-bubble mx-auto text-2xl" aria-hidden="true">
          ⟳
        </span>
        <h1 className="mt-4 text-xl font-extrabold sm:text-2xl">{t("err.pageTitle")}</h1>
        <p className="mt-2 text-muted">{t("err.pageText")}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              retry();
              window.location.reload();
            }}
          >
            {t("err.reload")}
          </button>
          <Link href="/" className="btn btn-ghost">
            {t("err.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
