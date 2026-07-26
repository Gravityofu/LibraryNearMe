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
  buttonStyles: ButtonStyle[];
  fontFamily: string;
};

const DEFAULT_THEME: ThemeState = {
  footerBgColor: "#383838",
  footerTextColor: "#F9F6F0",
  sidebarBgColor: "#383838",
  sidebarTextColor: "#F9F6F0",
  buttonStyles: [{ name: "버튼1", bgColor: "#383838", textColor: "#F9F6F0" }],
  fontFamily: "pretendard",
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
          buttonStyles:
            Array.isArray(data.buttonStyles) && data.buttonStyles.length > 0
              ? data.buttonStyles
              : DEFAULT_THEME.buttonStyles,
          fontFamily: data.fontFamily || DEFAULT_THEME.fontFamily,
        });
      })
      .catch(() => {});
  }, []);

  // 글꼴이 바뀔 때마다, 실제 화면에 그 글꼴을 적용합니다.
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
    // 그래서 <body> 태그에 직접 글꼴을 지정해서 확실하게 덮어씁니다.
    document.body.style.fontFamily = option.stack;
  }, [theme.fontFamily]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// 다른 화면에서는 이 훅(useTheme) 하나만 불러서 색상/글꼴 정보를 쓸 수 있어요.
export function useTheme() {
  return useContext(ThemeContext);
}