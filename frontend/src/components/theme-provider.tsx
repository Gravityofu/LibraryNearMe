"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
};

const DEFAULT_THEME: ThemeState = {
  footerBgColor: "#383838",
  footerTextColor: "#F9F6F0",
  sidebarBgColor: "#383838",
  sidebarTextColor: "#F9F6F0",
  buttonStyles: [{ name: "버튼1", bgColor: "#383838", textColor: "#F9F6F0" }],
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
        });
      })
      .catch(() => {});
  }, []);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// 다른 화면에서는 이 훅(useTheme) 하나만 불러서 색상 정보를 쓸 수 있어요.
export function useTheme() {
  return useContext(ThemeContext);
}