# 12단계 (4) — KOLIS-NET 검색으로 MARC 자동 채우기

> 목표: 지난번 만든 MARC 편집기 위에 **"KOLIS-NET에서 가져오기"** 검색창을 붙입니다.
> 제목/저자로 검색 → 결과 중 하나를 고르면 → 국가자료공동목록에 있는 MARC를
> 자동으로 받아와 편집기 칸을 채웁니다. 사서는 확인·수정만 하고 저장하면 끝!
> 소요 시간: 약 50분

---

## 오늘 만드는 것 (그림으로)

```
[검색창] "해리포터" 검색
   ↓
KOLIS-NET에 있는 책 목록이 쭉 뜸 (제목·저자·발행처·발행년·소장도서관)
   ↓
그중 하나 "이 자료 가져오기" 클릭
   ↓
그 책의 진짜 MARC(245·100·260·056...)를 받아와서
지난번 만든 편집기 칸에 자동으로 채워짐
   ↓
사서가 눈으로 확인·수정 → 저장
```

**왜 두 번에 나눠 받나요?** KOLIS-NET은 "검색"은 누구나 열쇠 없이 할 수 있지만,
"MARC 원본 받기"는 도서관 전용 열쇠(인증키)가 있어야 해요. 그래서:

1. **검색** — 인증키 없이, 목록만 받음 (여기서 책마다 `REC_KEY`라는 식별번호를 같이 줌)
2. **MARC 받기** — 그 `REC_KEY`로, 인증키를 넣어서 진짜 MARC 원본을 받음

두 요청 모두 **backend가 대신 심부름**을 해줘요(프록시). 인증키가 브라우저에 노출되면 안 되니까,
인증키는 항상 backend의 `.env`에만 두고, backend가 KOLIS-NET에 대신 요청을 보냅니다.

준비: backend·frontend 두 서버를 모두 켜 두세요.

---

## 1. 인증키를 backend `.env`에 추가 — 약 5분

`backend` 폴더의 **`.env`** 파일을 엽니다. 맨 아래에 두 줄을 추가하세요.

```
KOLIS_LIB_CODE=여기에_도서관부호
KOLIS_AUTHKEY=여기에_인증키
```

- **도서관부호(lib_code)**와 **인증키(authkey)**는 국가자료공동목록(KOLIS-NET)에 가입한 도서관에
  발급된 값이에요. 소속 도서관이 이미 KOLIS-NET 담당자로 등록되어 있다면 관리 화면이나
  담당 부서를 통해 확인할 수 있어요. 아직 모르신다면, 이 자리에 임시로 아무 값이나 넣고
  나머지 단계를 먼저 만든 뒤, 진짜 값이 생기면 그때 바꿔 넣어도 됩니다(검색까지는 인증키 없이도 시험 가능).

🔒 `.env` 파일은 절대 GitHub에 올라가면 안 돼요. `backend/.gitignore`에 `.env`가 있는지 다시 한번 확인해 주세요.

---

## 2. MARC 원본 텍스트를 해석하는 도구 추가 — 약 12분

지난번 만든 `backend/src/materials/marc.util.ts` 파일을 엽니다. **파일 맨 아래**에 아래 함수를 이어 붙입니다(기존 내용은 그대로 두고 추가만).

```ts
// ---- 여기부터 12-4 추가 ----

// KOLIS-NET에서 받은 MARC 원본(ISO 2709 형식) 텍스트를,
// 우리 편집기가 쓰는 {tag, ind1, ind2, value} 목록으로 바꿔주는 함수.
//
// ISO 2709 구조 (초등학생도 알 수 있게 설명):
// - 맨 앞 24글자 = "리더"(레코드 전체 정보, 우리는 안 씀)
// - 그다음부터 "목차"(어떤 태그가 몇 번째 글자부터 몇 글자인지 적어놓은 표) —
//   목차는 필드구분자(FT, 눈에 안 보이는 특수문자)가 나올 때까지 이어짐
// - 그 뒤가 진짜 내용(각 태그의 값)이 필드구분자로 나뉘어 쭉 이어짐
export function parseIso2709(rawInput: string): MarcField[] {
  const FT = "\x1e"; // 필드 구분자 (하나의 태그가 끝나는 지점)
  const US = "\x1f"; // 서브필드 구분자 (▼ 자리)

  // 파일 맨 앞에 보이지 않는 표시(BOM)가 붙어 있으면 제거
  let raw = rawInput;
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  // 목차는 24번째 글자부터 시작해서, 첫 필드구분자가 나오는 곳까지
  const dirEnd = raw.indexOf(FT, 24);
  if (dirEnd === -1) return []; // 형식이 다르면 빈 배열(아래 3-확인하기에서 원본을 같이 봐요)

  const directory = raw.substring(24, dirEnd);
  const dataArea = raw.substring(dirEnd + 1);

  const fields: MarcField[] = [];

  // 목차는 12글자씩 한 태그: 태그(3) + 길이(4) + 시작위치(5)
  for (let i = 0; i + 12 <= directory.length; i += 12) {
    const entry = directory.substring(i, i + 12);
    const tag = entry.substring(0, 3);
    const length = parseInt(entry.substring(3, 7), 10);
    const start = parseInt(entry.substring(7, 12), 10);
    if (!tag || Number.isNaN(length) || Number.isNaN(start)) continue;

    let content = dataArea.substr(start, length);
    if (content.endsWith(FT)) content = content.slice(0, -1); // 맨 끝 구분자 제거

    if (tag.startsWith("00")) {
      // 00X 태그(제어필드)는 지시기호·서브필드 없이 값만 있음
      fields.push({ tag, ind1: " ", ind2: " ", value: content });
    } else {
      const ind1 = content.charAt(0) || " ";
      const ind2 = content.charAt(1) || " ";
      const subfieldsRaw = content.substring(2);
      // "\x1fa내용\x1fb내용" → "▼a내용▼b내용" (우리 편집기 형식)
      const value = subfieldsRaw
        .split(US)
        .filter((part) => part.length > 0)
        .map((part) => "▼" + part)
        .join("");
      fields.push({ tag, ind1, ind2, value });
    }
  }

  return fields;
}
```

> 잘 이해가 안 가도 괜찮아요! 요약하면: "받아온 MARC 텍스트를 규칙대로 잘라서, 지난번 만든 편집기가 읽을 수 있는 `{tag, ind1, ind2, value}` 목록으로 바꾸는 함수"예요. 4단계에서 진짜로 시험해 보면서 필요하면 같이 고칠 거예요.

---

## 3. KOLIS-NET에 직접 요청 보내는 도구 만들기 — 약 10분

`backend` → `src` → `materials` 폴더에 **`kolis.util.ts`** 파일을 새로 만들어 붙여넣습니다.

```ts
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

// XML 조각(block) 안에서 <태그>내용</태그> 하나를 뽑아내는 아주 단순한 함수.
// (KOLIS-NET 응답은 XML이라, 별도 라이브러리 없이 이 정도로도 충분히 읽을 수 있어요.)
function pickTag(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : undefined;
}

// 1) 검색 — 인증키 없이 누구나 가능. 결과 목록 + 각 항목의 REC_KEY를 돌려줌.
export async function searchKolis(keyword: string): Promise<KolisSearchItem[]> {
  const url = `${SEARCH_URL}?page=1&per_page=10&search_field1=total_field&value1=${encodeURIComponent(
    keyword,
  )}`;

  const res = await fetch(url);
  const xml = await res.text();

  const blocks = xml.match(/<RECORD>[\s\S]*?<\/RECORD>/g) ?? [];

  return blocks
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
  const raw = await res.text();
  const marc = parseIso2709(raw);

  return { marc, raw };
}
```

> `fetch`는 Node에 기본으로 들어 있어서 따로 설치할 필요 없어요. 혹시 backend 코드에 `fetch`
> 밑에 빨간 줄(오류)이 보이면, backend 폴더에서 `npm i -D @types/node@latest` 를 실행하고
> VS Code를 껐다 켜보세요.

---

## 4. 저장 로직(service)에 두 함수 연결하기 — 약 5분

`backend/src/materials/materials.service.ts`를 엽니다.

**① 맨 위 import 줄 근처에 추가:**

```ts
import { searchKolis, getKolisMarc } from "./kolis.util";
```

**② `createBibliographic` 함수 안, MARC 처리하는 부분을 아래로 교체:**

```ts
    let fields: any;
    if (Array.isArray(marc) && marc.length > 0) {
      // 책·DVD: MARC에서 각 칸을 자동으로 뽑고, 원본도 함께 저장
      fields = extractColumns(marc);
      fields.marc = marc;
      if (data.marcRaw) fields.marcRaw = data.marcRaw; // KOLIS-NET에서 받은 원본 텍스트(있으면)
    } else {
```

(이 위·아래 나머지 부분은 지난번 그대로 두면 됩니다. `if (data.marcRaw) ...` 한 줄만 추가하는 거예요.)

**③ 클래스 안, `createBibliographic` 함수 옆에 두 함수를 새로 추가:**

```ts
  async searchKolisNet(keyword: string) {
    if (!keyword || !keyword.trim()) {
      throw new BadRequestException("검색어를 입력하세요.");
    }
    return searchKolis(keyword.trim());
  }

  async importKolisMarc(recKey: string) {
    if (!recKey) {
      throw new BadRequestException("recKey가 없습니다.");
    }
    return getKolisMarc(recKey);
  }
```

---

## 5. 컨트롤러에 검색·가져오기 창구 추가 — 약 5분

`backend/src/materials/materials.controller.ts`를 엽니다.

**① 맨 위 import 줄에 `Query`가 없다면 추가:**

```ts
import { Controller, Post, Get, Body, Req, Query, UseGuards } from "@nestjs/common";
```

**② 클래스 안, 기존 `@Post()` 아래에 두 창구를 추가:**

```ts
  @Get("kolis-search")
  @UseGuards(AdminGuard)
  kolisSearch(@Query("keyword") keyword: string) {
    return this.materials.searchKolisNet(keyword);
  }

  @Get("kolis-marc")
  @UseGuards(AdminGuard)
  kolisMarc(@Query("recKey") recKey: string) {
    return this.materials.importKolisMarc(recKey);
  }
```

✅ **확인하기**: backend 터미널에 빨간 오류 없이 서버가 그대로 켜져 있으면 됩니다.

---

## 6. 프론트 — 자료 등록 화면에 검색창 붙이기 — 약 12분

`frontend/src/app/admin/materials/new/page.tsx` 를 엽니다. 지난번 만든 파일을 아래처럼 고칩니다.

**① import 줄에 `useState` 근처, 필요하면 그대로 두고 아래 상태 4개를 컴포넌트 맨 위(`const [type, ...] = useState("book");` 근처)에 추가:**

```tsx
  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<
    { recKey: string; title?: string; author?: string; publisher?: string; pubYear?: string; libName?: string }[]
  >([]);
  const [kolisLoading, setKolisLoading] = useState(false);
  const [marcRaw, setMarcRaw] = useState<string | undefined>(undefined);
```

**② `handleSave` 함수 바로 위에 검색·가져오기 함수 두 개를 추가:**

```tsx
  async function searchKolis() {
    const token = localStorage.getItem("token");
    if (!kolisKeyword.trim() || !token) return;
    setKolisLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/materials/kolis-search?keyword=${encodeURIComponent(kolisKeyword)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setKolisResults(await res.json());
      } else {
        notify("❌ KOLIS-NET 검색에 실패했습니다.", "error");
      }
    } finally {
      setKolisLoading(false);
    }
  }

  async function importKolis(recKey: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/kolis-marc?recKey=${recKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMarc(data.marc);
      setMarcRaw(data.raw);
      notify("✅ MARC를 가져왔습니다. 편집기에서 확인해 주세요.", "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || "MARC를 가져오지 못했습니다."), "error");
    }
  }
```

**③ `handleSave` 안, body 만드는 줄을 아래로 교체:**

```tsx
    const body = usesMarc ? { type, marc, marcRaw } : { type, ...form };
```

그리고 저장 성공 시 초기화하는 줄에 `setMarcRaw(undefined);`와 `setKolisResults([]);`도 같이 넣어주세요.

```tsx
    if (res.ok) {
      notify("✅ 등록되었습니다.", "success");
      setForm({});
      setMarc(DEFAULT_FIELDS);
      setMarcRaw(undefined);
      setKolisResults([]);
    } else {
```

**④ 화면(JSX)에서 `{usesMarc ? (` 바로 다음, `<MarcEditor .../>` 바로 위에 검색창 블록을 추가:**

```tsx
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
            <p className="mb-2 text-sm font-semibold">KOLIS-NET에서 가져오기</p>
            <div className="flex gap-2">
              <input
                value={kolisKeyword}
                onChange={(e) => setKolisKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchKolis()}
                placeholder="제목 또는 저자로 검색"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={searchKolis}
                className="cursor-pointer rounded-lg bg-[#383838] px-4 py-2 text-sm text-[#F9F6F0]"
              >
                검색
              </button>
            </div>

            {kolisLoading && <p className="mt-2 text-sm text-neutral-400">검색 중...</p>}

            {kolisResults.length > 0 && (
              <ul className="mt-3 divide-y divide-neutral-200">
                {kolisResults.map((r) => (
                  <li key={r.recKey} className="flex items-center justify-between gap-2 py-2">
                    <div className="text-sm">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-neutral-400">
                        {r.author} · {r.publisher} · {r.pubYear} · {r.libName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => importKolis(r.recKey)}
                      className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                    >
                      이 자료 가져오기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
```

> 이 블록은 `usesMarc`일 때만 보이므로, 책·DVD를 골랐을 때만 검색창이 나타나요.

---

## 7. 실제 인증키로 확인하기 — 약 8분

1. `backend/.env`에 **진짜** `KOLIS_LIB_CODE`, `KOLIS_AUTHKEY`를 넣고 backend 서버를 껐다 다시 켭니다(`.env`는 서버를 새로 켜야 반영돼요).
2. 관리자 → 자료 등록 → 종류 **도서(book)** 선택.
3. 검색창에 아는 책 제목(예: 평소 소장한 책)을 넣고 **검색** → 목록이 뜨는지 확인.
4. 목록 중 하나를 **"이 자료 가져오기"** → "✅ MARC를 가져왔습니다" 팝업과 함께, 아래 편집기의 245·100·260·056 같은 줄에 실제 값이 채워지는지 확인.
5. 값이 이상하게 깨져 보이거나(예: 빈 칸, 이상한 기호), 아예 채워지지 않는다면 — **당황하지 마시고** 그 상태(빨간 오류가 있다면 화면 캡처, 없다면 어떤 칸이 비었는지)를 알려주세요. 2단계의 `parseIso2709` 함수는 KOLIS-NET 매뉴얼의 표준 규격대로 짠 것이라 대부분 맞지만, 실제 파일에서 미세하게 다르면 그 자리에서 같이 고치면 됩니다.
6. 잘 채워졌다면 **저장** → Prisma Studio에서 `title`·`creator`·`classNumber`뿐 아니라 `marcRaw` 칸에도 원본 텍스트가 들어있는지 확인해 보세요.

✅ 검색 → 가져오기 → 편집기 자동 채움 → 저장까지 되면 12단계(4) 완성입니다! 🎉

---

## 8. GitHub에 저장 — 약 2분

```
cd C:\projects\LibraryNearMe
git status
```

🔒 `.env`가 목록에 없는지 다시 한번 확인한 뒤:

```
git add .
git commit -m "12단계(4): KOLIS-NET 검색으로 MARC 자동 채우기"
git push
```

---

## 최종 점검표

- [ ] `backend/.env`에 `KOLIS_LIB_CODE`, `KOLIS_AUTHKEY` 추가
- [ ] `marc.util.ts`에 `parseIso2709` 함수 추가
- [ ] `backend/src/materials/kolis.util.ts` 생성 (`searchKolis`, `getKolisMarc`)
- [ ] `materials.service.ts` — import 추가, `marcRaw` 처리 한 줄, `searchKolisNet`/`importKolisMarc` 함수 추가
- [ ] `materials.controller.ts` — `Query` import, `kolis-search`/`kolis-marc` 창구 추가
- [ ] `admin/materials/new/page.tsx` — 상태 4개, 함수 2개, body에 `marcRaw`, 검색창 UI 추가
- [ ] 실제 인증키로 검색→가져오기→편집기 자동 채움 확인
- [ ] Prisma Studio에서 `marcRaw` 저장 확인
- [ ] GitHub에 올림

---

## 다음 단계 예고 — 12단계 (5): 실물(부수) 등록

서지(Material)는 이미 등록되어 있으니, 이제 **실제로 도서관에 있는 책 한 권 한 권**을 등록합니다.
자료를 검색해서 불러온 뒤, 기존 소장 부수 목록 옆의 "추가" 버튼으로 등록번호·청구기호·별치기호·서가번호·소장처·메모를 입력해요. 책·DVD뿐 아니라 공구·장비처럼 실물이 있는 모든 종류에 똑같이 적용됩니다. 완료되면 알려주세요!
