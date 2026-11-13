"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { translator, type Lang, type TFn } from "@/lib/i18n";
import { setLang } from "@/app/actions/lang";

const LangContext = createContext<{ lang: Lang; t: TFn }>({ lang: "ml", t: translator("ml") });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: translator(lang) }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  return useContext(LangContext);
}

export function LangSwitch() {
  const { lang } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (l: Lang) => {
    if (l === lang) return;
    start(async () => {
      await setLang(l);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={`flex shrink-0 rounded-full border border-sand-2 bg-paper p-0.5 text-sm font-semibold ${pending ? "opacity-60" : ""}`}
    >
      {(
        [
          ["ml", "മല"],
          ["en", "EN"],
        ] as const
      ).map(([l, label]) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={lang === l}
          lang={l}
          className={`h-8 min-w-10 rounded-full px-2.5 transition ${lang === l ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
