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

  // 041(언어) 태그가 없으면, 008(고정길이 정보) 태그의 35~37번째 글자(언어코드 3자리)를 대신 씁니다.
  const field008 = marc.find((x) => x.tag === "008")?.value;
  const languageFrom008 = field008 ? field008.substring(35, 38).trim() : undefined;

  return {
    title: one("245", "a"),                    // 서명
    creator: one("100", "a") || one("245", "d"), // 저자(100 없으면 245 ▼d)
    publisher: one("260", "b"),                // 발행처
    pubYear: one("260", "c"),                  // 발행년
    isbn: one("020", "a"),                     // ISBN
    classNumber: one("056", "a"),              // 분류기호
    format: cleanTag("300") || undefined,      // 형태사항
    subject: subjects || undefined,            // 주제어
    language: one("041", "a") || languageFrom008 || undefined, // 언어(041 없으면 008로 대체)
    summary: one("500", "a"),                  // 요약/주기
  };
}

// KOLIS-NET에서 받은 MARC 원본(ISO 2709 형식) 텍스트를,
// 우리 편집기가 쓰는 {tag, ind1, ind2, value} 목록으로 바꿔주는 함수.
//
// ISO 2709 구조 (초등학생도 알 수 있게 설명):
// - 맨 앞 24글자 = "리더"(레코드 전체 정보, 우리는 안 씀)
// - 그다음부터 "목차"(어떤 태그가 몇 번째 글자부터 몇 글자인지 적어놓은 표) —
//   목차는 필드구분자(FT, 눈에 안 보이는 특수문자)가 나올 때까지 이어짐
// - 그 뒤가 진짜 내용(각 태그의 값)이 필드구분자로 나뉘어 쭉 이어짐

export function parseIso2709(buf: Buffer): MarcField[] {
  const FT = "\x1e"; // 필드 구분자
  const US = "\x1f"; // 서브필드 구분자

  // 바이트 하나 = 글자 하나(latin1)로 그대로 옮겨서, 위치 계산이 바이트 단위와 정확히 맞도록 합니다.
  // (한글이 섞여도 여기서는 아직 "해석"하지 않고 바이트 개수만 다루는 것이 핵심이에요.)
  let raw = buf.toString("latin1");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const dirEnd = raw.indexOf(FT, 24);
  if (dirEnd === -1) return [];

  const directory = raw.substring(24, dirEnd);
  const dataArea = raw.substring(dirEnd + 1);

  // latin1로 옮겨둔 조각을 진짜 한글(UTF-8)로 되돌리는 함수. 실제 "내용"을 읽을 때만 이걸 씁니다.
  const toUtf8 = (s: string) => Buffer.from(s, "latin1").toString("utf8");

  const fields: MarcField[] = [];

  for (let i = 0; i + 12 <= directory.length; i += 12) {
    const entry = directory.substring(i, i + 12);
    const tag = entry.substring(0, 3);
    const length = parseInt(entry.substring(3, 7), 10);
    const start = parseInt(entry.substring(7, 12), 10);
    if (!tag || Number.isNaN(length) || Number.isNaN(start)) continue;

    let content = dataArea.substr(start, length);
    if (content.endsWith(FT)) content = content.slice(0, -1);

    if (tag.startsWith("00")) {
      fields.push({ tag, ind1: " ", ind2: " ", value: toUtf8(content) });
    } else {
      const ind1 = content.charAt(0) || " ";
      const ind2 = content.charAt(1) || " ";
      const subfieldsRaw = content.substring(2);
      const value = subfieldsRaw
        .split(US)
        .filter((part) => part.length > 0)
        .map((part) => "▼" + toUtf8(part))
        .join("");
      fields.push({ tag, ind1, ind2, value });
    }
  }

  return fields;
}