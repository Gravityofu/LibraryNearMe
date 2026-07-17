"use client";

import Link from "next/link";
import { useI18n } from "@/components/language-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full bg-[#383838] p-6 text-[#F9F6F0] md:w-52">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-extrabold">{t("admin.title")}</p>
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="cursor-pointer rounded-md border border-white/25 px-2 py-1 text-xs font-semibold text-[#F9F6F0]/80 hover:bg-white/10"
          >
            {lang === "ko" ? "ENG" : "한국어"}
          </button>
        </div>

        <nav className="mt-6 flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-1">
          <Link href="/admin" className="rounded-lg bg-white/10 px-3 py-2.5 font-bold">
            {t("admin.menu.settings")}
          </Link>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">{t("admin.menu.books")}</span>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">{t("admin.menu.members")}</span>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">{t("admin.menu.loans")}</span>
        </nav>

        <div className="mt-6 border-t border-white/15 pt-4">
          <Link href="/" className="text-[13px] text-[rgba(249,246,240,0.6)]">
            {t("admin.backHome")}
          </Link>
        </div>
      </aside>

      <section className="flex-1">{children}</section>
    </div>
  );
}