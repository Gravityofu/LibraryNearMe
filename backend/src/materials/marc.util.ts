// MARC 한 줄의 구조: { tag: "245", ind1: "0", ind2: "0", value: "▼a홍길동전▼d허균" }
export type MarcField = {
  tag: string;
  ind1: string;
  ind2: string;
  value: string;
};

// value("▼a홍길동전▼d허균")에서 원하는 서브필드(예: "a") 하나를 뽑습니다.
export function sub(value: string, code: string): string | undefined {
  if (!value) return undefined;
  for (const part of value.split("▼")) {
    if (part.startsWith(code)) return part.slice(code.length).trim();
  }
  return undefined;
}

// value에서 ▼표시를 걷어내고 사람이 읽기 좋은 한 줄로 만듭니다. (형태사항 300 등에 사용)
export function clean(value: string): string {
  if (!value) return "";
  return value
    .split("▼")
    .map((p) => p.slice(1).trim()) // 맨 앞 글자(서브필드 코드) 제거
    .filter(Boolean)
    .join(" ")
    .trim();
}

// MARC 태그 목록에서 표의 각 칸 값을 뽑아냅니다.
export function extractColumns(marc: MarcField[]) {
  const one = (tag: string, code: string) => {
    const f = marc.find((x) => x.tag === tag);
    return f ? sub(f.value, code) : undefined;
  };
  const cleanTag = (tag: string) => {
    const f = marc.find((x) => x.tag === tag);
    return f ? clean(f.value) : undefined;
  };
  // 주제어(653)는 여러 줄일 수 있어 모두 모아 "; "로 잇습니다.
  const subjects = marc
    .filter((x) => x.tag === "653")
    .map((x) => sub(x.value, "a"))
    .filter(Boolean)
    .join("; ");

  return {
    title: one("245", "a"),                    // 서명
    creator: one("100", "a") || one("245", "d"), // 저자(100 없으면 245 ▼d)
    publisher: one("260", "b"),                // 발행처
    pubYear: one("260", "c"),                  // 발행년
    isbn: one("020", "a"),                     // ISBN
    classNumber: one("056", "a"),              // 분류기호
    format: cleanTag("300") || undefined,      // 형태사항
    subject: subjects || undefined,            // 주제어
    language: one("041", "a"),                 // 언어
    summary: one("500", "a"),                  // 요약/주기
  };
}