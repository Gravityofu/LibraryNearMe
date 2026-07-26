"use client";

import { useTheme } from "@/components/theme-provider";

type Props = {
  preset?: string; // 관리자 설정 "디자인" 탭에서 만든 버튼 이름 (기본값: "버튼1")
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

// 관리자 설정에서 정한 색상을 자동으로 읽어와 적용하는 버튼입니다.
// 예: <ThemedButton preset="버튼1">저장</ThemedButton>
export default function ThemedButton({ preset = "버튼1", className = "", style, children, ...rest }: Props) {
  const { buttonStyles } = useTheme();
  const found = buttonStyles.find((b) => b.name === preset);
  const bgColor = found?.bgColor || "#383838";
  const textColor = found?.textColor || "#F9F6F0";

  return (
    <button
      type="button"
      className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold ${className}`}
      style={{ backgroundColor: bgColor, color: textColor, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}