"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, lang, setLang } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();

  const pathname = usePathname();

  // 지금 보고 있는 페이지 주소(pathname)에 따라 메뉴 강조 스타일을 골라주는 함수
  function navClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return `rounded-lg px-3 py-2.5 ${
      active
        ? "bg-white/10 font-bold text-[#F9F6F0]"
        : "text-[#F9F6F0] hover:bg-white/10"
    }`;
  }


  function handleLogout() {
    logout();
    router.push("/"); // 로그아웃하면 홈으로
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex w-full flex-col bg-[#383838] p-6 text-[#F9F6F0] md:w-52">
        <div className="flex items-center justify-between">
          <p className="text-[0.9375rem] font-extrabold">{t("admin.title")}</p>
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="cursor-pointer rounded-md border border-white/25 px-2 py-1 text-xs font-semibold text-[rgba(249,246,240,0.8)] hover:bg-white/10"
          >
            {lang === "ko" ? "ENG" : "한국어"}
          </button>
        </div>

        <nav className="mt-6 flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-1">
          <Link href="/admin" className={navClass("/admin", true)}>
            {t("admin.menu.settings")}
          </Link>
          <Link href="/admin/materials/new" className={navClass("/admin/materials/new")}>
            {t("admin.menu.materialsNew")}
          </Link>
          <Link href="/admin/materials/copies" className={navClass("/admin/materials/copies")}>
            {t("admin.menu.materialsCopy")}
          </Link>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">{t("admin.menu.members")}</span>
          <span className="px-3 py-2.5 text-[rgba(249,246,240,0.6)]">{t("admin.menu.loans")}</span>
        </nav>

        <div className="mt-6 border-t border-white/15 pt-4">
          <Link href="/" className="text-[0.8125rem] text-[rgba(249,246,240,0.6)]">
            {t("admin.backHome")}
          </Link>
        </div>

        {/* 하단 고정: 버전 · 제작자 · 로그아웃 */}
        <div className="mt-auto border-t border-white/15 pt-4">
          <p className="text-xs text-[rgba(249,246,240,0.55)]">버전 1.0.0</p>
          <p className="mt-1 text-xs text-[rgba(249,246,240,0.55)]">ⓒ 2026 Gravityofu</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full cursor-pointer rounded-lg border border-white/25 py-2 text-xs font-semibold text-[#F9F6F0] hover:bg-white/10"
          >
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      <section className="flex-1">{children}</section>
    </div>
  );
}