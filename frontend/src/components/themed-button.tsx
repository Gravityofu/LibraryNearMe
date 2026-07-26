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
  // preset 이름의 버튼 스타일을 찾고, 만약 삭제되어 없다면 "버튼1"의 색상을 대신 씁니다.
  const found = buttonStyles.find((b) => b.name === preset) || buttonStyles.find((b) => b.name === "버튼1");
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