"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary, type Lang } from "@/lib/dictionary";

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  // 저장돼 있던 언어 설정을 불러옵니다.
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "ko" || saved === "en") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("lang", l); // 다음에 와도 유지되게 저장
  }

  // 이름표(key)를 넣으면 현재 언어의 문구를 돌려줍니다.
  function t(key: string) {
    return dictionary[lang][key] ?? key;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// 화면 어디서든 언어와 번역 함수를 꺼내 쓰는 도구
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("LanguageProvider 안에서만 사용하세요.");
  return ctx;
}