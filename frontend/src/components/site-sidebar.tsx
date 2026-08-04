"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/language-provider";
import { useAuth } from "@/components/auth-provider";
import LanguageToggle from "@/components/language-toggle";
import { INFO_BOARD_CODES, ABOUT_BOARD_CODES, MYSHELF_BOARD_CODES } from "@/lib/site-nav";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Board = { code: string };

export default function SiteSidebar({
  name,
  primaryColor,
}: {
  name: string;
  primaryColor?: string;
}) {
  const { t } = useI18n();
  const { isLoggedIn, userName, role, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState<number[]>([]); // 처음엔 전부 접힌 상태로 시작합니다.
  const [boards, setBoards] = useState<Board[]>([]);

  // 게시판 목록을 불러옵니다. (메뉴에 실제 게시판 링크를 채우기 위함)
  useEffect(() => {
    fetch(`${API_URL}/public/boards`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBoards(data))
      .catch(() => setBoards([]));
  }, []);

  const infoBoards = boards.filter((b) => INFO_BOARD_CODES.includes(b.code));
  const aboutBoards = boards.filter((b) => ABOUT_BOARD_CODES.includes(b.code));
  const myshelfBoards = boards.filter((b) => MYSHELF_BOARD_CODES.includes(b.code));
  const communityBoards = boards.filter(
    (b) =>
      !INFO_BOARD_CODES.includes(b.code) &&
      !ABOUT_BOARD_CODES.includes(b.code) &&
      !MYSHELF_BOARD_CODES.includes(b.code),
  );

  // 큰 메뉴 4개와, 그 밑에 보여줄 하위 메뉴들입니다. (순서: 정보와 자료 → 커뮤니티 → 도서관 소개 → 내 도서관)
  const MENU = [
    {
      key: "nav.search",
      items: [
        { key: "nav.search.all", href: "/" },
        ...infoBoards.map((b) => ({ key: `boards.tabs.${b.code}`, href: `/boards/${b.code}` })),
      ],
    },
    {
      key: "nav.community",
      items: communityBoards.map((b) => ({ key: `boards.tabs.${b.code}`, href: `/boards/${b.code}` })),
    },
    {
      key: "nav.about",
      items: [
        { key: "nav.about.greeting", href: "#" },
        { key: "nav.about.facilities", href: "#" },
        { key: "nav.use.guide", href: "#" },
        { key: "nav.use.location", href: "#" },
        { key: "nav.use.hours", href: "#" },
        ...aboutBoards.map((b) => ({ key: `boards.tabs.${b.code}`, href: `/boards/${b.code}` })),
      ],
    },
    {
      key: "nav.myshelf",
      items: [
        { key: "nav.myshelf.loans", href: "#" },
        { key: "nav.myshelf.reservations", href: "#" },
        { key: "nav.myshelf.card", href: "#" },
        ...myshelfBoards.map((b) => ({ key: `boards.tabs.${b.code}`, href: `/boards/${b.code}` })),
      ],
    },
  ];

  // 지금 보고 있는 페이지가 어느 메뉴 그룹에 속하는지 찾아서, 그 그룹 하나만 펼칩니다.
  // (다른 메뉴로 이동하면, 이전에 펼쳐져 있던 그룹은 자동으로 닫힙니다.)
  useEffect(() => {
    const activeIndex = MENU.findIndex((group) =>
      group.items.some((item) => item.href !== "#" && (pathname === item.href || pathname.startsWith(item.href + "/"))),
    );
    if (activeIndex >= 0) {
      setOpen([activeIndex]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, boards]);

  // 메뉴를 직접 눌렀을 때: 그 메뉴 하나만 펼치고, 이미 그 메뉴만 펼쳐져 있었다면 접습니다.
  function toggle(i: number) {
    setOpen((prev) => (prev.length === 1 && prev[0] === i ? [] : [i]));
  }

  function isActiveItem(href: string) {
    if (href === "#") return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const isStaff = role === "ADMIN" || role === "SUPER";

  return (
    <aside className="rounded-xl border border-neutral-200 bg-white p-3.5">
      {/* 로고 + 언어 토글 */}
      <div className="flex items-center justify-between px-2 pb-3.5 pt-2">
        <Link href="/" className="text-lg font-extrabold" style={{ color: primaryColor }}>
          {name}
        </Link>
        <LanguageToggle />
      </div>

      {/* 로그인 상태에 따라 다르게 */}
      {isLoggedIn ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2.5 text-sm">
            <span className="font-medium">
              {t("auth.greeting").replace("{name}", userName ?? "")}
            </span>
            <button
              onClick={logout}
              className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800"
            >
              {t("auth.logout")}
            </button>
          </div>
          {isStaff && (
            <Link
              href="/admin"
              className="block rounded-lg bg-[#383838] py-2.5 text-center text-sm font-semibold text-[#F9F6F0]"
            >
              {t("auth.adminPage")}
            </Link>
          )}
        </div>
      ) : (
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="block rounded-lg bg-[#383838] py-2.5 text-center text-sm font-semibold text-[#F9F6F0]"
        >
          {t("auth.button")}
        </Link>
      )}

      {/* 아코디언 메뉴 */}
      <nav className="mt-4">
        {MENU.map((group, i) => (
          <div key={group.key} className="border-b border-neutral-100 last:border-b-0">
            <button
              onClick={() => toggle(i)}
              className="flex w-full cursor-pointer items-center justify-between px-2 py-2.5 text-sm font-semibold"
            >
              {t(group.key)}
              <span
                className={`text-[0.625rem] text-neutral-400 transition-transform ${
                  open.includes(i) ? "rotate-90" : ""
                }`}
              >
                ▸
              </span>
            </button>
            {open.includes(i) && (
              <div className="pb-2">
                {group.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block rounded-md px-4 py-1.5 text-[0.8125rem] ${
                      isActiveItem(item.href)
                        ? "bg-neutral-100 font-bold text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}