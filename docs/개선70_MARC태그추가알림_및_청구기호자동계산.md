# 개선 70: MARC 태그 추가 시 빈 값 알림 + 청구기호 자동 계산

## 목표

두 가지를 고칩니다.

1. MARC 정보를 입력할 때 새 태그를 추가하려면 태그 번호를 입력하고 '+ 태그 추가' 버튼을 눌러야 합니다. 지금은 태그 번호를 비워둔 채(또는 세 자리 숫자가 아닌 값을 입력한 채) 버튼을 누르면 아무 반응이 없습니다. 이제는 이런 경우 모달 알림으로 "태그를 입력해야 추가됩니다"라고 안내합니다.
2. 실물 자료 등록 시 '청구기호'는 우리 도서관 규칙상 별치기호 + 분류기호 + 저자기호 + 권/호 + 복본을 조합해서 만들어지는 값이라, 사람이 직접 입력할 필요가 없습니다. 이제 '청구기호' 입력 칸은 비활성화(직접 입력 불가)하고, 별치기호를 선택하거나 저자기호·권/호·복본을 입력할 때마다 청구기호가 자동으로 조합되어 채워지도록 합니다. 분류기호는 그 자료의 MARC 056 태그(없으면 090 태그)의 `▼a` 값을 그대로 사용합니다. 필수 입력 표시(`*`)도 '청구기호'에서 '저자기호'로 옮기고, 청구기호와 저자기호 모두 값이 있어야 저장되도록 합니다.

---

## 1. MARC 태그 추가 시 빈 값 알림 넣기

### 1-1. 문구 추가하기: `dictionary.ts`

`C:\projects\LibraryNearMe\frontend\src\lib\dictionary.ts` 파일을 여세요.

아래 부분을 찾으세요. (한국어 묶음 안에서, `materials.new.kolisModalTitle` 근처를 찾으시면 됩니다.)

```ts
    "materials.new.kolisModalTitle": "KOLIS-NET 검색 결과",
```

이렇게 바꿔주세요.

```ts
    "materials.new.kolisModalTitle": "KOLIS-NET 검색 결과",
    "materials.marcEditor.tagRequiredTitle": "태그를 입력해주세요",
    "materials.marcEditor.tagRequiredMessage": "태그 번호(3자리 숫자, 예: 700)를 입력하고 '+ 태그 추가' 버튼을 눌러야 태그가 추가됩니다.",
```

다음으로 아래 부분을 찾으세요. (영어 묶음 안에 있습니다.)

```ts
    "materials.new.kolisModalTitle": "KOLIS-NET Search Results",
```

이렇게 바꿔주세요.

```ts
    "materials.new.kolisModalTitle": "KOLIS-NET Search Results",
    "materials.marcEditor.tagRequiredTitle": "Please Enter a Tag",
    "materials.marcEditor.tagRequiredMessage": "Enter a 3-digit tag number (e.g. 700) and press '+ Add Tag' to add it.",
```

파일을 저장하세요.

### 1-2. 화면 수정하기: `marc-editor.tsx`

`C:\projects\LibraryNearMe\frontend\src\components\marc-editor.tsx` 파일을 여세요.

먼저 아래 부분을 찾으세요.

```tsx
"use client";

import { useState } from "react";
```

이렇게 바꿔주세요.

```tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/components/language-provider";
```

다음으로 아래 부분을 찾으세요.

```tsx
export default function MarcEditor({
  fields,
  onChange,
}: {
  fields: MarcField[];
  onChange: (f: MarcField[]) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const sorted = [...fields].sort((a, b) => a.tag.localeCompare(b.tag));

  function update(i: number, key: keyof MarcField, val: string) {
    onChange(sorted.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  }
  function addField() {
    const tag = newTag.trim();
    if (!/^\d{3}$/.test(tag)) return; // 세 자리 숫자만
    onChange([...sorted, { tag, ind1: " ", ind2: " ", value: "▼a" }]);
    setNewTag("");
  }
```

이렇게 바꿔주세요.

```tsx
export default function MarcEditor({
  fields,
  onChange,
}: {
  fields: MarcField[];
  onChange: (f: MarcField[]) => void;
}) {
  const { t } = useI18n();
  const [newTag, setNewTag] = useState("");
  const [showTagRequiredError, setShowTagRequiredError] = useState(false);
  const sorted = [...fields].sort((a, b) => a.tag.localeCompare(b.tag));

  function update(i: number, key: keyof MarcField, val: string) {
    onChange(sorted.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  }
  function addField() {
    const tag = newTag.trim();
    if (!/^\d{3}$/.test(tag)) {
      // 태그를 비워두었거나, 3자리 숫자가 아니면 알림 모달을 띄웁니다.
      setShowTagRequiredError(true);
      return;
    }
    onChange([...sorted, { tag, ind1: " ", ind2: " ", value: "▼a" }]);
    setNewTag("");
  }
```

마지막으로 아래 부분을 찾으세요. (컴포넌트의 맨 끝부분입니다.)

```tsx
        <button
          type="button"
          onClick={addField}
          className="cursor-pointer rounded-lg bg-[#383838] px-3 py-1.5 text-sm text-[#F9F6F0]"
        >
          + 태그 추가
        </button>
      </div>
    </div>
  );
}
```

이렇게 바꿔주세요.

```tsx
        <button
          type="button"
          onClick={addField}
          className="cursor-pointer rounded-lg bg-[#383838] px-3 py-1.5 text-sm text-[#F9F6F0]"
        >
          + 태그 추가
        </button>
      </div>

      {showTagRequiredError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowTagRequiredError(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold">{t("materials.marcEditor.tagRequiredTitle")}</p>
            <p className="text-sm text-neutral-600">{t("materials.marcEditor.tagRequiredMessage")}</p>
            <button
              type="button"
              onClick={() => setShowTagRequiredError(false)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500"
            >
              {t("loans.member.closeBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

파일을 저장하세요.

---

## 2. 분류기호를 090 태그에서도 가져오게 하기: `marc.util.ts`

`C:\projects\LibraryNearMe\backend\src\materials\marc.util.ts` 파일을 여세요.

아래 부분을 찾으세요.

```ts
    classNumber: one("056", "a"),              // 분류기호
```

이렇게 바꿔주세요.

```ts
    classNumber: one("056", "a") || one("090", "a"), // 분류기호 (056 ▼a가 없으면 090 ▼a를 대신 씁니다)
```

파일을 저장하세요.

---

## 3. 청구기호 자동 계산하기: `page.tsx`

`C:\projects\LibraryNearMe\frontend\src\app\admin\materials\copies\page.tsx` 파일을 여세요.

### 3-1. 청구기호를 조합해주는 도구 함수 추가하기

아래 부분을 찾으세요.

```tsx
// 가장 최근 등록번호의 다음 숫자를 계산합니다. (등록번호는 1,2,3... 순수 숫자입니다.)
function computeNextRegNo(latest: string | null): string {
  if (!latest) return "1";
  const n = parseInt(latest, 10);
  if (Number.isNaN(n)) return "";
  return String(n + 1);
}
```

이렇게 바꿔주세요.

```tsx
// 가장 최근 등록번호의 다음 숫자를 계산합니다. (등록번호는 1,2,3... 순수 숫자입니다.)
function computeNextRegNo(latest: string | null): string {
  if (!latest) return "1";
  const n = parseInt(latest, 10);
  if (Number.isNaN(n)) return "";
  return String(n + 1);
}

// 청구기호 = 별치기호 + 분류기호 + 저자기호 + 권/호 + 복본. 값이 있는 것만 이어 붙입니다.
function computeCallNumber(
  specialCode: string,
  classNumber: string,
  authorCode: string,
  volume: string,
  copyNumber: string,
): string {
  return [specialCode, classNumber, authorCode, volume, copyNumber]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(" ");
}
```

### 3-2. 별치기호·저자기호·권/호·복본이 바뀔 때마다 청구기호를 자동으로 다시 계산하기

아래 부분을 찾으세요.

```tsx
  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => setPrimaryColor(data?.primaryColor || "#2563eb"))
      .catch(() => {});
  }, []);
```

이렇게 바꿔주세요.

```tsx
  useEffect(() => {
    fetch(`${API_URL}/library`)
      .then((res) => res.json())
      .then((data) => setPrimaryColor(data?.primaryColor || "#2563eb"))
      .catch(() => {});
  }, []);

  // 별치기호, 저자기호, 권/호, 복본이 바뀔 때마다 청구기호를 자동으로 다시 계산합니다.
  useEffect(() => {
    const computed = computeCallNumber(
      form.specialCode,
      material?.classNumber || "",
      form.authorCode,
      form.volume,
      form.copyNumber,
    );
    setForm((prev) => (prev.callNumber === computed ? prev : { ...prev, callNumber: computed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.specialCode, form.authorCode, form.volume, form.copyNumber, material?.classNumber]);
```

### 3-3. 청구기호 입력 칸 비활성화하고, 필수 표시(`*`) 위치 옮기기

아래 부분을 찾으세요.

```tsx
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.callNumber")} *</span>
                <input
                  value={form.callNumber}
                  onChange={(e) => setForm({ ...form, callNumber: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.authorCode")}</span>
                <input
                  value={form.authorCode}
                  onChange={(e) => setForm({ ...form, authorCode: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
```

이렇게 바꿔주세요.

```tsx
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.callNumber")}</span>
                <input
                  value={form.callNumber}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-neutral-500">{t("materials.copies.authorCode")} *</span>
                <input
                  value={form.authorCode}
                  onChange={(e) => setForm({ ...form, authorCode: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
              </label>
```

### 3-4. 저장 전 필수 항목 확인 목록에 저자기호 추가하기

아래 부분을 찾으세요.

```tsx
  // 등록번호·상태·청구기호·별치기호·소장처, 이 5개 항목이 모두 채워졌는지 확인합니다.
  function validateRequiredFields(): boolean {
    if (
      !form.registrationNo.trim() ||
      !form.status.trim() ||
      !form.callNumber.trim() ||
      !form.specialCode.trim() ||
      !form.location.trim()
    ) {
      notify("❌ " + t("materials.copies.requiredFieldsMissing"), "error");
      return false;
    }
    return true;
  }
```

이렇게 바꿔주세요.

```tsx
  // 등록번호·상태·청구기호·저자기호·별치기호·소장처, 이 6개 항목이 모두 채워졌는지 확인합니다.
  function validateRequiredFields(): boolean {
    if (
      !form.registrationNo.trim() ||
      !form.status.trim() ||
      !form.callNumber.trim() ||
      !form.authorCode.trim() ||
      !form.specialCode.trim() ||
      !form.location.trim()
    ) {
      notify("❌ " + t("materials.copies.requiredFieldsMissing"), "error");
      return false;
    }
    return true;
  }
```

파일을 저장하세요.

(청구기호는 이제 직접 입력할 수 없고 자동으로 채워지지만, 그 자료에 분류기호(056/090 ▼a)가 아예 없거나 별치기호·저자기호가 비어 있으면 청구기호도 비어 있게 됩니다. 이 경우 저장이 막히니, 저자기호를 입력하거나 그 자료의 MARC에 분류기호가 들어있는지 함께 확인해주세요.)

---

## 확인하기

1. 백엔드와 프런트엔드 서버를 재시작하세요.
2. '자료 등록' 화면에서 MARC 입력 중, 태그 번호 칸을 비워둔 채 '+ 태그 추가'를 눌러보세요. "태그를 입력해주세요" 모달이 뜨는지 확인하세요.
3. 태그 번호에 3자리 숫자(예: `700`)를 입력하고 '+ 태그 추가'를 누르면 정상적으로 태그가 추가되는지 확인하세요.
4. 실물 자료 등록 화면에서 '청구기호' 칸이 회색 배경으로 비활성화되어 직접 입력할 수 없는지 확인하세요.
5. 별치기호를 다른 값으로 바꾸거나, 저자기호·권/호·복본에 값을 입력할 때마다 '청구기호' 칸이 자동으로 갱신되는지 확인하세요.
6. '저자기호' 라벨 옆에 `*` 표시가 보이고, '청구기호'에는 더 이상 `*`가 없는지 확인하세요.
7. 저자기호를 비워둔 채 저장을 시도하면 필수 항목 안내와 함께 저장이 막히는지 확인하세요.
8. MARC에 090 태그만 있고 056 태그가 없는 자료에서도, 그 090 ▼a 값이 분류기호로 잘 쓰여서 청구기호에 반영되는지 확인하세요.

---

## GitHub 커밋

모든 확인이 끝났다면 아래 명령어로 변경 내용을 저장하세요.

```
cd C:\projects\LibraryNearMe
git add .
git commit -m "개선70: MARC 태그 추가 시 빈 값 알림 모달 추가, 청구기호 자동 계산 및 필수 표시 위치 변경"
git push
```

---

## 최종 점검표

- [ ] 태그를 입력하지 않고 '+ 태그 추가'를 누르면 알림 모달이 뜬다.
- [ ] 3자리 숫자를 입력하면 정상적으로 태그가 추가된다.
- [ ] 분류기호가 056 태그뿐 아니라 090 태그에서도 가져와진다.
- [ ] '청구기호' 입력 칸이 비활성화되어 있다.
- [ ] 별치기호/저자기호/권호/복본을 바꾸면 청구기호가 자동으로 갱신된다.
- [ ] `*` 표시가 '저자기호'로 옮겨졌다.
- [ ] 청구기호나 저자기호가 비어 있으면 저장이 막힌다.
- [ ] 변경 내용을 GitHub에 커밋 및 푸시했다.
