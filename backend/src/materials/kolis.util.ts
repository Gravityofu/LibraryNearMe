import { MarcField, parseIso2709 } from "./marc.util";

const SEARCH_URL = "http://nl.go.kr/kolisnet/openApi/open.php";
const MARC_URL = "http://nl.go.kr/kolisnet/openApi/api/request/getMarc.php";

export type KolisSearchItem = {
  recKey: string;
  title?: string;
  author?: string;
  publisher?: string;
  pubYear?: string;
  type?: string;
  libName?: string;
};

// XML이 이스케이프한 기호(&lt; &gt; 등)를 원래 글자(< >)로 되돌립니다.
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// XML 조각(block) 안에서 <태그>내용</태그> 하나를 뽑아내는 아주 단순한 함수.
// (KOLIS-NET 응답은 XML이라, 별도 라이브러리 없이 이 정도로도 충분히 읽을 수 있어요.)
function pickTag(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeEntities(m[1].trim()) : undefined;
}

export type KolisSearchResult = {
  total: number;
  page: number;
  perPage: number;
  items: KolisSearchItem[];
};

// 1) 검색 — 인증키 없이 누구나 가능. page번째 페이지 결과 + 전체 건수를 돌려줌.
export async function searchKolis(keyword: string, page = 1): Promise<KolisSearchResult> {
  const perPage = 10;
  const url = `${SEARCH_URL}?page=${page}&per_page=${perPage}&search_field1=total_field&value1=${encodeURIComponent(
    keyword,
  )}`;

  const res = await fetch(url);
  const xml = await res.text();

  const totalMatch = xml.match(/<TOTAL>([\s\S]*?)<\/TOTAL>/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const blocks = xml.match(/<RECORD>[\s\S]*?<\/RECORD>/g) ?? [];
  const items = blocks
    .map((block) => ({
      recKey: pickTag(block, "REC_KEY") ?? "",
      title: pickTag(block, "TITLE"),
      author: pickTag(block, "AUTHOR"),
      publisher: pickTag(block, "PUBLISHER"),
      pubYear: pickTag(block, "PUBYEAR"),
      type: pickTag(block, "TYPE"),
      libName: pickTag(block, "LIB_NAME"),
    }))
    .filter((item) => item.recKey);

  return { total, page, perPage, items };
}

// 2) MARC 원본 받기 — 도서관부호 + 인증키 필요(.env에서 읽음).
export async function getKolisMarc(
  recKey: string,
): Promise<{ marc: MarcField[]; raw: string }> {
  const libCode = process.env.KOLIS_LIB_CODE;
  const authKey = process.env.KOLIS_AUTHKEY;

  if (!libCode || !authKey) {
    throw new Error(
      "KOLIS_LIB_CODE / KOLIS_AUTHKEY가 backend .env에 없습니다. 1단계를 확인하세요.",
    );
  }

  const url = `${MARC_URL}?lib_code=${libCode}&authkey=${authKey}&rec_key=${recKey}&encodingType=U`;

  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer()); // 바이트 그대로 받기
  const marc = parseIso2709(buf);
  const raw = buf.toString("utf8"); // 저장·참고용 원본 텍스트는 그대로 한글로

  return { marc, raw };
}