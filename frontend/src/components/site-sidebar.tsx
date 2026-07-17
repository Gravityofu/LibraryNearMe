"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/language-provider";
import LanguageToggle from "@/components/language-toggle";

// 이제 글자 대신 '이름표(키)'를 씁니다.
const MENU = [
  { key: "nav.search", items: [
    { key: "nav.search.all", href: "/" },
    { key: "nav.search.new", href: "#" },
    { key: "nav.search.popular", href: "#" },
  ]},
  { key: "nav.use", items: [
    { key: "nav.use.guide", href: "#" },
    { key: "nav.use.location", href: "#" },
    { key: "nav.use.hours", href: "#" },
  ]},
  { key: "nav.community", items: [
    { key: "nav.community.notice", href: "#" },
    { key: "nav.community.free", href: "#" },
    { key: "nav.community.club", href: "#" },
    { key: "nav.community.request", href: "#" },
  ]},
  { key: "nav.myshelf", items: [
    { key: "nav.myshelf.loans", href: "#" },
    { key: "nav.myshelf.reservations", href: "#" },
    { key: "nav.myshelf.card", href: "#" },
  ]},
  { key: "nav.about", items: [
    { key: "nav.about.greeting", href: "#" },
    { key: "nav.about.facilities", href: "#" },
  ]},
];

export default function SiteSidebar({
  name,
  primaryColor,
}: {
  name: string;
  primaryColor?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number[]>([0]);

  function toggle(i: number) {
    setOpen((prev) =>
      prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]
    );
  }

  return (
    <aside className="rounded-xl border border-neutral-200 bg-white p-3.5">
      {/* 로고 + 언어 토글 */}
      <div className="flex items-center justify-between px-2 pb-3.5 pt-2">
        <Link href="/" className="text-lg font-extrabold" style={{ color: primaryColor }}>
          {name}
        </Link>
        <LanguageToggle />
      </div>

      <Link
        href="/login"
        className="block rounded-lg bg-[#383838] py-2.5 text-center text-sm font-semibold text-[#F9F6F0]"
      >
        {t("auth.button")}
      </Link>

      <nav className="mt-4">
        {MENU.map((group, i) => (
          <div key={group.key} className="border-b border-neutral-100 last:border-b-0">
            <button
              onClick={() => toggle(i)}
              className="cursor-pointer flex w-full items-center justify-between px-2 py-2.5 text-sm font-semibold"
            >
              {t(group.key)}
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
                    key={item.key}
                    href={item.href}
                    className="block rounded-md px-4 py-1.5 text-[13px] text-neutral-600 hover:bg-neutral-50"
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