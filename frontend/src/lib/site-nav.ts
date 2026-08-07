// 홈페이지 사이드바 메뉴와, 게시판 화면의 브레드크럼(현재 위치 표시)에서
// "이 게시판이 어느 큰 메뉴에 속하는지" 함께 알아야 해서, 한 곳에 모아둡니다.

// '정보와 자료' 메뉴 밑에 보여줄 게시판들
export const INFO_BOARD_CODES = ["newArrivals", "collection", "refService", "scrap", "dailyQuote"];

// '도서관 소개' 메뉴 밑에 보여줄 게시판들
export const ABOUT_BOARD_CODES = ["faq"];

// '내 도서관' 메뉴 밑에 보여줄 게시판들
export const MYSHELF_BOARD_CODES = ["materialRequest", "counsel"];

// 나머지는 전부 '커뮤니티' 메뉴 밑에 보여줍니다 (공지, 소식, 열린 게시판)

// 게시판 코드를 넣으면, 그 게시판이 속한 큰 메뉴의 다국어 키를 돌려줍니다.
export function getBoardGroupKey(code: string): string {
  if (INFO_BOARD_CODES.includes(code)) return "nav.search";
  if (ABOUT_BOARD_CODES.includes(code)) return "nav.about";
  if (MYSHELF_BOARD_CODES.includes(code)) return "nav.myshelf";
  return "nav.community";
}