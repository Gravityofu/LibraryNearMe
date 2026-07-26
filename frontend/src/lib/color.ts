// "#383838" 같은 색상 코드를, 투명도가 있는 "rgba(56, 56, 56, 0.6)" 형태로 바꿔줍니다.
// 사이드바의 흐린 글자(부제목 등)를 관리자가 고른 색에 맞춰 자동으로 흐리게 만들 때 씁니다.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}