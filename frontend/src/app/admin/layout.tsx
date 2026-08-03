"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/components/theme-provider";
import { hexToRgba } from "@/lib/color";

// 화면 주소별로 상단에 보여줄 경로(브레드크럼)를 정의합니다.
// 배열에 문구가 두 개면 "A › B" 처럼 화살표로 이어서 보여줍니다.
const BREADCRUMB_MAP: Record<string, string[]> = {
  "/admin": ["admin.menu.dashboard"],
  "/admin/settings": ["admin.menu.systemSettings"],
  "/admin/materials/list": ["admin.menu.materialsList"],
  "/admin/materials/new": ["admin.menu.materialsList", "admin.menu.materialsNew"],
  "/admin/materials/copies": ["admin.menu.materialsList", "admin.menu.materialsCopy"],
  "/admin/members": ["admin.menu.members"],
  "/admin/loans": ["admin.menu.loans"], // '대출/반납'은 탭에 따라 아래 BreadcrumbBar에서 다시 계산합니다.
  "/admin/loans/reservation": ["admin.menu.loans", "loans.tabs.reservation", "loans.reservationNew.pageTitle"],
};

// '대출/반납' 화면의 ?tab= 값 → 브레드크럼 두 번째 칸에 보여줄 문구 매핑입니다.
const LOANS_TAB_CRUMB_MAP: Record<string, string> = {
  checkout: "loans.tabs.checkout",
  return: "loans.tabs.return",
  reservation: "loans.tabs.reservation",
  history: "loans.tabs.history",
};

// '설정' 화면의 ?tab= 값 → 브레드크럼 두 번째 칸에 보여줄 문구 매핑입니다.
const SETTINGS_TAB_CRUMB_MAP: Record<string, string> = {
  library: "settings.tabs.library",
  design: "settings.tabs.design",
  materialTypes: "settings.tabs.materialTypes",
  copyOptions: "settings.tabs.copyOptions",
  kormarcTags: "settings.tabs.kormarcTags",
  loan: "settings.tabs.loan",
};

// 브레드크럼만 따로 떼어낸 부분입니다. 주소의 ?tab= 값을 읽어야 해서(useSearchParams)
// <Suspense>로 감싸서 씁니다.
function BreadcrumbBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let crumbs = BREADCRUMB_MAP[pathname];
  if (pathname === "/admin/loans") {
    const tab = searchParams.get("tab") || "checkout";
    crumbs = ["admin.menu.loans", LOANS_TAB_CRUMB_MAP[tab] || LOANS_TAB_CRUMB_MAP.checkout];
  }
  if (pathname === "/admin/settings") {
    const tab = searchParams.get("tab") || "library";
    crumbs = ["admin.menu.systemSettings", SETTINGS_TAB_CRUMB_MAP[tab] || SETTINGS_TAB_CRUMB_MAP.library];
  }

  if (!crumbs) return null;

  return (
    <div className="px-6 pt-4 text-xs text-neutral-400">
      {crumbs.map((key, i) => (
        <span key={key}>
          {i > 0 && <span className="mx-1.5">›</span>}
          {t(key)}
        </span>
      ))}
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const { t, lang, setLang } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();
  useRequireAuth();
  const pathname = usePathname();
  const { sidebarBgColor, sidebarTextColor } = useTheme();

  function navClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return `rounded-lg px-3 py-2.5 font-medium ${active ? "bg-white/10 font-bold" : "hover:bg-white/10"}`;
  }

  function handleLogout() {
    logout();
    router.push("/"); // 로그아웃하면 홈으로
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className="flex w-full flex-col p-6 md:w-52"
        style={{ backgroundColor: sidebarBgColor, color: sidebarTextColor }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[0.9375rem] font-extrabold">{t("admin.title")}</p>
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="cursor-pointer rounded-md border border-white/25 px-2 py-1 text-xs font-semibold hover:bg-white/10"
            style={{ color: hexToRgba(sidebarTextColor, 0.8) }}
          >
            {lang === "ko" ? "ENG" : "한국어"}
          </button>
        </div>

        <nav className="mt-6 flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-1">
          <Link href="/admin" className={navClass("/admin", true)}>
            {t("admin.menu.dashboard")}
          </Link>
          <Link href="/admin/materials/list" className={navClass("/admin/materials")}>
            {t("admin.menu.materialsList")}
          </Link>
          <Link href="/admin/members" className={navClass("/admin/members")}>
            {t("admin.menu.members")}
          </Link>
          <Link href="/admin/loans" className={navClass("/admin/loans")}>
            {t("admin.menu.loans")}
          </Link>
          <Link href="/admin/settings" className={navClass("/admin/settings")}>
            {t("admin.menu.systemSettings")}
          </Link>
        </nav>

        <div className="mt-6 border-t border-white/15 pt-4">
          <Link href="/" className="text-[0.8125rem]" style={{ color: hexToRgba(sidebarTextColor, 0.6) }}>
            {t("admin.backHome")}
          </Link>
        </div>

        {/* 하단 고정: 버전 · 제작자 · 로그아웃 */}
        <div className="mt-auto border-t border-white/15 pt-4">
          <p className="text-xs" style={{ color: hexToRgba(sidebarTextColor, 0.55) }}>
            버전 1.0.0
          </p>
          <p className="mt-1 text-xs" style={{ color: hexToRgba(sidebarTextColor, 0.55) }}>
            ⓒ 2026 Gravityofu
          </p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full cursor-pointer rounded-lg border border-white/25 py-2 text-xs font-semibold hover:bg-white/10"
          >
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      <section className="flex-1">
        <Suspense fallback={null}>
          <BreadcrumbBar />
        </Suspense>
        {children}
      </section>
    </div>
  );
}