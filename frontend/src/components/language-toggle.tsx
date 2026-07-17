"use client";

import { useI18n } from "@/components/language-provider";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "ko" ? "en" : "ko")}
      className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
    >
      {lang === "ko" ? "ENG" : "한국어"}
    </button>
  );
}