// 디자인 탭에서 고를 수 있는 글꼴 목록입니다.
// key: 데이터베이스에 저장되는 값
// label: 관리자 설정 화면에 보이는 이름
// stack: 실제 CSS에 적용되는 글꼴 목록
// googleFontUrl: 구글 폰트를 새로 불러와야 하면 그 주소, 아니면 null
export type FontOption = {
  key: string;
  label: string;
  stack: string;
  googleFontUrl: string | null;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    key: "pretendard",
    label: "Pretendard (기본)",
    stack:
      '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
    googleFontUrl: null,
  },
  {
    key: "noto-sans-kr",
    label: "노토 산스 (Noto Sans KR)",
    stack: '"Noto Sans KR", sans-serif',
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap",
  },
  {
    key: "nanum-gothic",
    label: "나눔고딕 (Nanum Gothic)",
    stack: '"Nanum Gothic", sans-serif',
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap",
  },
  {
    key: "system",
    label: "시스템 기본 글꼴",
    stack: '-apple-system, BlinkMacSystemFont, system-ui, "Malgun Gothic", sans-serif',
    googleFontUrl: null,
  },
  {
    key: "nanum-myeongjo",
    label: "나눔명조 (명조체)",
    stack: '"Nanum Myeongjo", serif',
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
  },
];

// 저장된 key로 글꼴 정보를 찾아줍니다. 못 찾으면 Pretendard를 기본으로 돌려줘요.
export function getFontOption(key: string): FontOption {
  return FONT_OPTIONS.find((f) => f.key === key) || FONT_OPTIONS[0];
}

// 디자인 탭에서 고를 수 있는 글자 굵기 목록입니다.
export type FontWeightOption = { value: string; label: string };

export const FONT_WEIGHT_OPTIONS: FontWeightOption[] = [
  { value: "400", label: "보통 (400)" },
  { value: "500", label: "약간 굵게 (500)" },
  { value: "600", label: "중간 굵게 (600)" },
  { value: "700", label: "굵게 (700)" },
  { value: "800", label: "매우 굵게 (800)" },
];