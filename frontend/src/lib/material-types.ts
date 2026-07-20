// 자료 종류 목록.
// usesMarc: 책·DVD처럼 KOLIS-NET MARC로 등록하는 종류인지 여부.
export const MATERIAL_TYPES = [
  { code: "book",       usesMarc: true  }, // 도서
  { code: "dvd",        usesMarc: true  }, // DVD
  { code: "article",    usesMarc: false }, // 기사
  { code: "thesis",     usesMarc: false }, // 논문
  { code: "law",        usesMarc: false }, // 법령
  { code: "video",      usesMarc: false }, // 영상
  { code: "music",      usesMarc: false }, // 음악
  { code: "webpage",    usesMarc: false }, // 웹페이지
  { code: "boardgame",  usesMarc: false }, // 보드게임
  { code: "tool",       usesMarc: false }, // 공구
  { code: "equipment",  usesMarc: false }, // 장비
  { code: "collection", usesMarc: false }, // 자료집
  { code: "photo",      usesMarc: false }, // 사진
  { code: "clipping",   usesMarc: false }, // 기사스크랩
  { code: "etc",        usesMarc: false }, // 기타
] as const;

export type MaterialTypeCode = (typeof MATERIAL_TYPES)[number]["code"];
export const MATERIAL_TYPE_CODES = MATERIAL_TYPES.map((m) => m.code);