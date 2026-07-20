export const MATERIAL_TYPES = [
  { code: "book",       usesMarc: true,  nameKo: "도서",       nameEn: "Book" },
  { code: "dvd",        usesMarc: true,  nameKo: "DVD",        nameEn: "DVD" },
  { code: "article",    usesMarc: false, nameKo: "기사",       nameEn: "Article" },
  { code: "thesis",     usesMarc: false, nameKo: "논문",       nameEn: "Thesis" },
  { code: "law",        usesMarc: false, nameKo: "법령",       nameEn: "Law" },
  { code: "video",      usesMarc: false, nameKo: "영상",       nameEn: "Video" },
  { code: "music",      usesMarc: false, nameKo: "음악",       nameEn: "Music" },
  { code: "webpage",    usesMarc: false, nameKo: "웹페이지",   nameEn: "Web Page" },
  { code: "boardgame",  usesMarc: false, nameKo: "보드게임",   nameEn: "Board Game" },
  { code: "tool",       usesMarc: false, nameKo: "공구",       nameEn: "Tool" },
  { code: "equipment",  usesMarc: false, nameKo: "장비",       nameEn: "Equipment" },
  { code: "collection", usesMarc: false, nameKo: "자료집",     nameEn: "Anthology" },
  { code: "photo",      usesMarc: false, nameKo: "사진",       nameEn: "Photo" },
  { code: "clipping",   usesMarc: false, nameKo: "기사스크랩", nameEn: "Clipping" },
  { code: "etc",        usesMarc: false, nameKo: "기타",       nameEn: "Other" },
] as const;

export type MaterialTypeCode = (typeof MATERIAL_TYPES)[number]["code"];
export const MATERIAL_TYPE_CODES = MATERIAL_TYPES.map((m) => m.code);