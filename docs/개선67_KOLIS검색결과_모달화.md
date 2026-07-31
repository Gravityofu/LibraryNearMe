# 개선 67: '자료 등록' 3단계 - KOLIS-NET 검색 결과를 모달로 보여주기

## 목표

'자료 등록' 3단계 화면은 표지 이미지 URL 입력 → KOLIS-NET 검색 → 세부 자료 정보 입력, 이렇게 세로로 쭉 이어져 있습니다. 그런데 KOLIS-NET 검색 결과가 많아지면 그 목록이 길어져서, 아래에 있는 세부 자료 정보 입력 칸까지 스크롤을 많이 내려야 합니다.

이번에는 검색 결과 목록을 화면에 그대로 펼쳐두지 않고 모달(팝업창)로 띄우도록 바꿉니다. 모달에서 자료 하나를 선택하면 모달은 닫히고, 검색창 바로 아래에 방금 고른 자료의 요약 정보(자료명, 제작자, 발행처, 발행년도, 도서관 정보가 있으면 그것까지)만 한 줄로 나타납니다. 그 아래에는 원래 있던 세부 자료 입력 폼(MARC 입력기)이 그대로 이어져서, 화면을 길게 내리지 않고도 바로 세부 정보를 입력할 수 있습니다.

---

## 1. 문구 추가하기: `dictionary.ts`

`C:\projects\LibraryNearMe\frontend\src\lib\dictionary.ts` 파일을 여세요.

### 1-1. 한국어 문구 추가

아래 부분을 찾으세요.

```ts
    "materials.new.kolisHeading": "KOLIS-NET에서 가져오기",
    "materials.new.kolisImport": "이 자료 가져오기",
```

이렇게 바꿔주세요.

```ts
    "materials.new.kolisHeading": "KOLIS-NET에서 가져오기",
    "materials.new.kolisImport": "이 자료 가져오기",
    "materials.new.kolisModalTitle": "KOLIS-NET 검색 결과",
```

### 1-2. 영어 문구 추가

아래 부분을 찾으세요.

```ts
    "materials.new.kolisHeading": "Import from KOLIS-NET",
    "materials.new.kolisImport": "Import this item",
```

이렇게 바꿔주세요.

```ts
    "materials.new.kolisHeading": "Import from KOLIS-NET",
    "materials.new.kolisImport": "Import this item",
    "materials.new.kolisModalTitle": "KOLIS-NET Search Results",
```

파일을 저장하세요.

---

## 2. 화면 수정하기: `page.tsx`

`C:\projects\LibraryNearMe\frontend\src\app\admin\materials\new\page.tsx` 파일을 여세요.

### 2-1. 검색 결과 하나의 모양(타입)을 이름 붙여서 따로 빼두기

아래 부분을 찾으세요.

```tsx
  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<
    { recKey: string; title?: string; author?: string; publisher?: string; pubYear?: string; libName?: string }[]
  >([]);
  const [kolisLoading, setKolisLoading] = useState(false);
  const [kolisPage, setKolisPage] = useState(1);
  const [kolisTotal, setKolisTotal] = useState(0);
```

이렇게 바꿔주세요.

```tsx
  const [kolisKeyword, setKolisKeyword] = useState("");
  const [kolisResults, setKolisResults] = useState<KolisResult[]>([]);
  const [kolisLoading, setKolisLoading] = useState(false);
  const [kolisPage, setKolisPage] = useState(1);
  const [kolisTotal, setKolisTotal] = useState(0);

  // 검색 결과 모달을 보이거나 숨길 때 씁니다.
  const [showKolisModal, setShowKolisModal] = useState(false);
  // 검색 결과 중에서 실제로 선택한 자료의 요약 정보를 기억해둡니다. (검색창 아래에 한 줄로 보여줄 용도입니다.)
  const [selectedKolisResult, setSelectedKolisResult] = useState<KolisResult | null>(null);
```

바로 위, `SIMPLE_FIELDS` 배열이 끝나는 부분을 찾으세요.

```tsx
const SIMPLE_FIELDS = [
  { key: "title", labelKey: "materials.new.field.title", required: true },
  { key: "creator", labelKey: "materials.new.field.creator" },
  { key: "publisher", labelKey: "materials.new.field.publisher" },
  { key: "pubYear", labelKey: "materials.new.field.pubYear" },
  { key: "isbn", labelKey: "materials.new.field.isbn" },
  { key: "classNumber", labelKey: "materials.new.field.classNumber" },
  { key: "format", labelKey: "materials.new.field.format" },
  { key: "subject", labelKey: "materials.new.field.subject" },
  { key: "language", labelKey: "materials.new.field.language" },
  { key: "summary", labelKey: "materials.new.field.summary" },
];
```

이렇게 바꿔주세요. (KOLIS-NET 검색 결과 하나의 모양을 `KolisResult`라는 이름으로 미리 정의해둡니다.)

```tsx
const SIMPLE_FIELDS = [
  { key: "title", labelKey: "materials.new.field.title", required: true },
  { key: "creator", labelKey: "materials.new.field.creator" },
  { key: "publisher", labelKey: "materials.new.field.publisher" },
  { key: "pubYear", labelKey: "materials.new.field.pubYear" },
  { key: "isbn", labelKey: "materials.new.field.isbn" },
  { key: "classNumber", labelKey: "materials.new.field.classNumber" },
  { key: "format", labelKey: "materials.new.field.format" },
  { key: "subject", labelKey: "materials.new.field.subject" },
  { key: "language", labelKey: "materials.new.field.language" },
  { key: "summary", labelKey: "materials.new.field.summary" },
];

type KolisResult = {
  recKey: string;
  title?: string;
  author?: string;
  publisher?: string;
  pubYear?: string;
  libName?: string;
};
```

### 2-2. 검색이 끝나면 모달을 열도록 바꾸기

아래 부분을 찾으세요.

```tsx
      if (res.ok) {
        const data = await res.json();
        setKolisResults(data.items);
        setKolisTotal(data.total);
        setKolisPage(data.page);
      } else {
        notify("❌ " + t("materials.new.kolisSearchFail"), "error");
      }
```

이렇게 바꿔주세요.

```tsx
      if (res.ok) {
        const data = await res.json();
        setKolisResults(data.items);
        setKolisTotal(data.total);
        setKolisPage(data.page);
        setShowKolisModal(true);
      } else {
        notify("❌ " + t("materials.new.kolisSearchFail"), "error");
      }
```

### 2-3. 자료를 선택했을 때, 요약 정보를 기억해두고 모달을 닫기

아래 부분을 찾으세요.

```tsx
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
      notify("✅ " + t("materials.new.importSuccess"), "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.new.importFail")), "error");
    }
  }
```

이렇게 바꿔주세요.

```tsx
  async function importKolis(item: KolisResult) {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`${API_URL}/materials/kolis-marc?recKey=${item.recKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMarc(data.marc);
      setMarcRaw(data.raw);
      setSelectedKolisResult(item);
      setShowKolisModal(false);
      notify("✅ " + t("materials.new.importSuccess"), "success");
    } else {
      const data = await res.json().catch(() => null);
      notify("❌ " + (data?.message || t("materials.new.importFail")), "error");
    }
  }
```

(이제 등록번호 하나만 받는 대신, 검색 결과 항목 전체(`item`)를 받습니다. 자료를 가져오는 데는 여전히 `item.recKey`만 쓰지만, 화면에 요약으로 보여줄 나머지 정보(자료명, 제작자 등)도 함께 기억해두기 위해서입니다.)

### 2-4. 화면에 펼쳐져 있던 검색 결과 목록을, 선택한 자료 요약 정보로 바꾸기

아래 부분을 찾으세요.

```tsx
                {kolisLoading && <p className="mt-2 text-sm text-neutral-400">{t("materials.searching")}</p>}

                {kolisResults.length > 0 && (
                  <ul className="mt-3 divide-y divide-neutral-200">
                    {kolisResults.map((r) => (
                      <li key={r.recKey} className="flex items-center justify-between gap-2 py-2">
                        <div className="text-sm">
                          <p className="font-medium">{renderTitle(r.title)}</p>
                          <p className="text-neutral-400">
                            {[truncate(r.author), truncate(r.publisher), truncate(r.pubYear), truncate(r.libName)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => importKolis(r.recKey)}
                          className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                        >
                          {t("materials.new.kolisImport")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {kolisTotal > 10 && (
                  <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                    <button
                      type="button"
                      disabled={kolisPage <= 1}
                      onClick={() => searchKolis(kolisPage - 1)}
                      className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("materials.new.pagePrev")}
                    </button>
                    <span className="text-neutral-500">
                      {kolisPage} / {Math.ceil(kolisTotal / 10)} {t("materials.pageWord")} ({t("materials.totalWord")}{" "}
                      {kolisTotal}
                      {t("materials.countUnit")})
                    </span>
                    <button
                      type="button"
                      disabled={kolisPage >= Math.ceil(kolisTotal / 10)}
                      onClick={() => searchKolis(kolisPage + 1)}
                      className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("materials.new.pageNext")}
                    </button>
                  </div>
                )}
              </div>
```

이렇게 바꿔주세요. (검색 결과 목록과 페이지 이동 버튼은 이제 모달 안으로 옮겨갑니다. 여기에는 검색 중 안내와, 선택한 자료의 요약 정보만 남습니다.)

```tsx
                {kolisLoading && <p className="mt-2 text-sm text-neutral-400">{t("materials.searching")}</p>}

                {selectedKolisResult && (
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                    <p className="font-medium">{renderTitle(selectedKolisResult.title)}</p>
                    <p className="text-neutral-400">
                      {[
                        truncate(selectedKolisResult.author, 999),
                        truncate(selectedKolisResult.publisher, 999),
                        truncate(selectedKolisResult.pubYear, 999),
                        truncate(selectedKolisResult.libName, 999),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}
              </div>
```

(`truncate(값, 999)`처럼 두 번째 값을 크게 주면, 원래 15자에서 잘라내던 것과 달리 글자를 자르지 않고 전체를 다 보여줍니다. `<b>` 태그만 제거하는 용도로 씁니다. 요약 정보는 목록이 아니라 딱 하나만 보여주는 것이라, 길게 잘라낼 필요가 없기 때문입니다.)

### 2-5. 검색 결과 모달 추가하기

아래 부분을 찾으세요. (KOLIS-NET 태그 도움말 모달이 시작되는 부분입니다.)

```tsx
      {showTagHelp && (
```

이렇게 바꿔주세요. (그 위에 검색 결과 모달을 새로 추가합니다.)

```tsx
      {showKolisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowKolisModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[75vh] overflow-auto p-6">
              <p className="mb-3 text-sm font-semibold">{t("materials.new.kolisModalTitle")}</p>

              {kolisResults.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("materials.list.noResults")}</p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {kolisResults.map((r) => (
                    <li key={r.recKey} className="flex items-center justify-between gap-2 py-2">
                      <div className="text-sm">
                        <p className="font-medium">{renderTitle(r.title)}</p>
                        <p className="text-neutral-400">
                          {[truncate(r.author), truncate(r.publisher), truncate(r.pubYear), truncate(r.libName)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => importKolis(r)}
                        className="shrink-0 cursor-pointer rounded border px-3 py-1.5 text-sm"
                      >
                        {t("materials.new.kolisImport")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {kolisTotal > 10 && (
                <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                  <button
                    type="button"
                    disabled={kolisPage <= 1}
                    onClick={() => searchKolis(kolisPage - 1)}
                    className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("materials.new.pagePrev")}
                  </button>
                  <span className="text-neutral-500">
                    {kolisPage} / {Math.ceil(kolisTotal / 10)} {t("materials.pageWord")} ({t("materials.totalWord")}{" "}
                    {kolisTotal}
                    {t("materials.countUnit")})
                  </span>
                  <button
                    type="button"
                    disabled={kolisPage >= Math.ceil(kolisTotal / 10)}
                    onClick={() => searchKolis(kolisPage + 1)}
                    className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("materials.new.pageNext")}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowKolisModal(false)}
                className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
              >
                {t("loans.member.closeBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagHelp && (
```

파일을 저장하세요.

---

## 확인하기

1. 프런트엔드 서버를 재시작하세요. (`npm run dev`)
2. '자료 등록' 화면에서 MARC를 쓰는 종류(예: 도서)를 선택해 3단계로 들어가세요.
3. KOLIS-NET 검색창에 검색어를 입력하고 검색해보세요. 검색 결과가 화면에 바로 펼쳐지지 않고, 모달(팝업)로 뜨는지 확인하세요.
4. 검색 결과가 없을 때는 모달 안에 "검색 결과가 없습니다."라고 안내되는지 확인하세요.
5. 검색 결과 중 하나를 선택해 '이 자료 가져오기'를 눌러보세요. 모달이 닫히고, 검색창 바로 아래에 방금 선택한 자료의 자료명 · 제작자 · 발행처 · 발행년도(있다면 도서관 정보까지)가 한 줄로 보이는지 확인하세요.
6. 그 아래에 세부 자료 입력 폼(MARC 입력기)이 이어서 바로 보이는지, 스크롤을 많이 내리지 않아도 되는지 확인하세요.
7. 검색 결과가 10건을 넘는 경우, 모달 안에서 페이지 이동 버튼(이전/다음)이 잘 작동하는지 확인하세요.
8. 다른 검색어로 다시 검색해서 새로운 자료를 선택하면, 아래 요약 정보가 새로 선택한 자료로 잘 바뀌는지 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선67: 자료 등록 3단계 - KOLIS-NET 검색 결과를 모달로 변경하고 선택한 자료 요약 정보 표시"
git push
```

---

## 최종 점검표

- [ ] KOLIS-NET 검색 결과가 모달로 뜬다.
- [ ] 검색 결과가 없으면 모달 안에 안내 문구가 뜬다.
- [ ] 자료를 선택하면 모달이 닫히고 요약 정보(자료명/제작자/발행처/발행년도/도서관정보)가 검색창 아래 한 줄로 보인다.
- [ ] 요약 정보 아래에 세부 자료 입력 폼이 바로 이어진다.
- [ ] 검색 결과가 많을 때 모달 안에서 페이지 이동이 잘 된다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
