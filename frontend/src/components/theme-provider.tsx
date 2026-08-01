"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getFontOption } from "@/lib/fonts";

export type ButtonStyle = {
  name: string;
  bgColor: string;
  textColor: string;
};

type ThemeState = {
  footerBgColor: string;
  footerTextColor: string;
  sidebarBgColor: string;
  sidebarTextColor: string;
  defaultTextColor: string;
  buttonStyles: ButtonStyle[];
  fontFamily: string;
  fontWeight: string;
};

const DEFAULT_THEME: ThemeState = {
  footerBgColor: "#383838",
  footerTextColor: "#F9F6F0",
  sidebarBgColor: "#383838",
  sidebarTextColor: "#F9F6F0",
  defaultTextColor: "#737373",
  buttonStyles: [{ name: "버튼1", bgColor: "#383838", textColor: "#F9F6F0" }],
  fontFamily: "pretendard",
  fontWeight: "400",
};

const API_URL = "http://localhost:3001";

const ThemeContext = createContext<ThemeState>(DEFAULT_THEME);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(DEFAULT_THEME);

  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setTheme({
          footerBgColor: data.footerBgColor || DEFAULT_THEME.footerBgColor,
          footerTextColor: data.footerTextColor || DEFAULT_THEME.footerTextColor,
          sidebarBgColor: data.sidebarBgColor || DEFAULT_THEME.sidebarBgColor,
          sidebarTextColor: data.sidebarTextColor || DEFAULT_THEME.sidebarTextColor,
          defaultTextColor: data.defaultTextColor || DEFAULT_THEME.defaultTextColor,
          buttonStyles:
            Array.isArray(data.buttonStyles) && data.buttonStyles.length > 0
              ? data.buttonStyles
              : DEFAULT_THEME.buttonStyles,
          fontFamily: data.fontFamily || DEFAULT_THEME.fontFamily,
          fontWeight: data.fontWeight || DEFAULT_THEME.fontWeight,
        });
      })
      .catch(() => {});
  }, []);

  // 글꼴이나 굵기가 바뀔 때마다, 실제 화면에 그대로 적용합니다.
  useEffect(() => {
    const option = getFontOption(theme.fontFamily);
    const linkId = "dynamic-font-link";
    let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;

    if (option.googleFontUrl) {
      // 구글 폰트가 필요한 경우, <link> 태그를 만들어서(또는 이미 있으면 주소만 바꿔서) 불러옵니다.
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.id = linkId;
        linkEl.rel = "stylesheet";
        document.head.appendChild(linkEl);
      }
      linkEl.href = option.googleFontUrl;
    } else if (linkEl) {
      // Pretendard나 시스템 폰트처럼 구글 폰트가 필요 없는 경우, 이전에 넣었던 링크를 지웁니다.
      linkEl.remove();
    }

    // Tailwind의 font-sans 클래스는 빌드할 때 값이 이미 고정되어버리기 때문에(=inline),
    // --font-sans 변수를 바꾸는 것만으로는 반영되지 않습니다.
    // 그래서 <body> 태그에 직접 글꼴과 굵기를 지정해서 확실하게 덮어씁니다.
    document.body.style.fontFamily = option.stack;
    document.body.style.fontWeight = theme.fontWeight;
  }, [theme.fontFamily, theme.fontWeight]);

  // 기본 글자색이 바뀔 때마다, CSS 변수(--default-text-color)에 실제 값을 넣어줍니다.
  // 화면 곳곳(표의 각 칸 등)에서는 이 CSS 변수를 참조하기 때문에, 여기서 값만 바꿔주면
  // '설정 → 도서관'에서 고른 색이 화면 전체에 그대로 반영됩니다.
  useEffect(() => {
    document.documentElement.style.setProperty("--default-text-color", theme.defaultTextColor);
  }, [theme.defaultTextColor]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// 다른 화면에서는 이 훅(useTheme) 하나만 불러서 색상/글꼴 정보를 쓸 수 있어요.
export function useTheme() {
  return useContext(ThemeContext);
}