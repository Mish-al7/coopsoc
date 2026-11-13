import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Mulish } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { LangProvider } from "@/components/lang";
import { getT } from "@/lib/i18n-server";

// Mulish = the "Muli" used on the society's website (Latin text).
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  display: "swap",
});

// Malayalam text.
const anek = Anek_Malayalam({
  variable: "--font-anek",
  subsets: ["malayalam", "latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: `${t("meta.title")} · ${t("society.short")}`, template: `%s · ${t("society.short")}` },
    description: t("society.name"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang } = await getT();
  return (
    <html lang={lang} className={`${mulish.variable} ${anek.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
