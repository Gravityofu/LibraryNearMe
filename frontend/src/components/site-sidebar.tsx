"use client";

import { useState } from "react";
import Link from "next/link";

// 왼쪽 메뉴 구성 (하위 페이지는 앞으로 하나씩 진짜 링크로 연결됩니다)
const MENU = [
  { title: "자료검색", items: [
    { label: "통합 검색", href: "/" },
    { label: "신착 자료", href: "#" },
    { label: "인기 자료", href: "#" },
  ]},
  { title: "도서관 이용", items: [
    { label: "이용 안내", href: "#" },
    { label: "오시는 길", href: "#" },
    { label: "운영 시간", href: "#" },
  ]},
  { title: "커뮤니티", items: [
    { label: "공지사항", href: "#" },
    { label: "자유게시판", href: "#" },
    { label: "독서모임", href: "#" },
    { label: "자료 신청", href: "#" },
  ]},
  { title: "내 서재", items: [
    { label: "대출 현황", href: "#" },
    { label: "예약 현황", href: "#" },
    { label: "모바일 회원증", href: "#" },
  ]},
  { title: "도서관 소개", items: [
    { label: "인사말", href: "#" },
    { label: "시설 안내", href: "#" },
  ]},
];

export default function SiteSidebar({
  name,
  primaryColor,
}: {
  name: string;
  primaryColor?: string;
}) {
  // 열려 있는 메뉴 번호 목록 (처음엔 0번=자료검색만 열림)
  const [open, setOpen] = useState<number[]>([0]);

  function toggle(i: number) {
    setOpen((prev) =>
      prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]
    );
  }

  return (
    <aside className="rounded-xl border border-neutral-200 bg-white p-3.5">
      {/* 로고 (왼쪽 정렬) */}
      <Link
        href="/"
        className="block px-2 pb-3.5 pt-2 text-lg font-extrabold"
        style={{ color: primaryColor }}
      >
        {name}
      </Link>

      {/* 로그인/회원가입 단일 버튼 (짙은 회색 + 아이보리 글씨) */}
      <Link
        href="/login"
        className="block rounded-lg bg-[#383838] py-2.5 text-center text-sm font-semibold text-[#F9F6F0]"
      >
        로그인 / 회원가입
      </Link>

      {/* 아코디언 메뉴 */}
      <nav className="mt-4">
        {MENU.map((group, i) => (
          <div key={group.title} className="border-b border-neutral-100 last:border-b-0">
            <button
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between px-2 py-2.5 text-sm font-semibold"
            >
              {group.title}
              <span
                className={`text-[10px] text-neutral-400 transition-transform ${
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
                    key={item.label}
                    href={item.href}
                    className="block rounded-md px-4 py-1.5 text-[13px] text-neutral-600 hover:bg-neutral-50"
                  >
                    {item.label}
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