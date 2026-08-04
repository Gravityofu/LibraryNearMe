// 화면에 시각을 보여줄 때 쓰는 도우미 함수입니다.
// 이 화면을 보는 사람의 컴퓨터/브라우저 시간대 설정과 상관없이,
// 항상 한국 시간(Asia/Seoul) 기준으로 계산해서 보여줍니다.
// (참고: backend/src/main.ts의 process.env.TZ = 'Asia/Seoul' 설정(개선86)과 같은 원리입니다.)

// "2026. 8. 4." 형태로 날짜만 보여줍니다. (게시판 목록 등에서 사용)
export function formatKstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// "2026년 8월 4일 오후 6시 50분" 형태로 날짜와 시간을 함께 보여줍니다. (게시글 상세 등에서 사용)
export function formatKstDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return `${get("year")}년 ${get("month")}월 ${get("day")}일 ${get("dayPeriod")} ${get("hour")}시 ${get("minute")}분`;
}