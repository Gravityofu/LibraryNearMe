"use client";

import { useState } from "react";
import { useI18n } from "@/components/language-provider";

export default function SearchBox() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") setSearched(true);
  }

  const hint = !searched
    ? t("home.searchHint")
    : q
    ? t("home.searchTodo").replace("{q}", q)
    : t("home.searchEmpty");

  return (
    <div className="mt-5">
      <div className="relative">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("home.searchPlaceholder")}
          className="h-[54px] w-full rounded-full border border-[#ddd6c9] bg-white pl-12 pr-6 text-[0.9375rem] outline-none focus:border-neutral-400"
        />
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">{hint}</p>
    </div>
  );
}